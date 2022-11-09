import { Block, BlockIDs } from '../blocks/block.js'
import { EntityIDs } from '../entities/entity.js'
import { DataReader, DataWriter } from '../utils/data.js'

export class Chunk{
	constructor(buffer, world){
		if(!buffer.left || buffer.byte() != 16)throw new TypeError("Invalid chunk data")
		const x = buffer.int(), y = buffer.int()
		this.x = x << 6 >> 6
		this.y = y << 6 >> 6
		this.world = world
		this.tiles = []
		this.entities = new Set()
		//read buffer palette
		let palettelen = (x >>> 26) + (y >>> 26) * 64 + 1
		let id = buffer.short()
		while(id){
			const e = EntityIDs[id](buffer.short() / 1024 + (this.x << 6), buffer.short() / 1024 + (this.y << 6), this.world)
			e.chunk = this
			buffer.setUint32(buffer.i, e._id)
			buffer.setUint16((buffer.i += 6) - 2, e._id / 4294967296)
			e.dx = buffer.float()
			e.dy = buffer.float()
			e.f = buffer.float()
			if(e._.savedata)buffer.read(e._.savedata, e)
			this.entities.add(e)
			id = buffer.short()
		}
		let palette = []
		let i = 0
		for(;i<palettelen;i++){
			palette.push(BlockIDs[buffer.short()])
		}
		let j = 0; i = 11 + i * 2
		if(palettelen<2){
			for(;j<4096;j++)this.tiles.push(palette[0]())
		}else if(palettelen == 2){
			for(;j<512;j++){
				const byte = buffer.byte()
				this.tiles.push(palette[byte&1]())
				this.tiles.push(palette[(byte>>1)&1]())
				this.tiles.push(palette[(byte>>2)&1]())
				this.tiles.push(palette[(byte>>3)&1]())
				this.tiles.push(palette[(byte>>4)&1]())
				this.tiles.push(palette[(byte>>5)&1]())
				this.tiles.push(palette[(byte>>6)&1]())
				this.tiles.push(palette[byte>>7]())
			}
		}else if(palettelen <= 4){
			for(;j<1024;j++){
				const byte = buffer.byte()
				this.tiles.push(palette[byte&3]())
				this.tiles.push(palette[(byte>>2)&3]())
				this.tiles.push(palette[(byte>>4)&3]())
				this.tiles.push(palette[byte>>6]())
			}
		}else if(palettelen <= 16){
			for(;j<2048;j++){
				const byte = buffer.byte()
				this.tiles.push(palette[byte&15]())
				this.tiles.push(palette[(byte>>4)]())
			}
		}else if(palettelen <= 256){
			for(;j<4096;j++){
				this.tiles.push(palette[buffer.byte()]())
			}
		}else{
			for(;j<6144;j+=3){
				let byte2
				this.tiles.push(palette[buffer.byte() + (((byte2 = buffer.byte())&0x0F)<<8)]())
				this.tiles.push(palette[buffer.byte() + ((byte2&0xF0)<<4)]())
			}
		}
		//parse block entities
		for(j=0;j<4096;j++){
			const block = this.tiles[j]._
			if(!block.savedata)continue
			buffer.read(block.savedata, block)
		}
	}
	toBuf(buf){
		let palette = [], palette2 = Object.create(null)
		for(let i = 0; i < 4096; i++){
			let id = this.tiles[i].id
			if(!(id in palette2)){
				palette2[id] = palette.length
				palette.push(id)
			}
		}
		buf.byte(16)
		buf.int((this.x & 0x3ffffff) + (palette.length-1 << 26))
		buf.int((this.y & 0x3ffffff) + (palette.length-1 >> 6 << 26))
		for(const e of this.entities){
			if(!e.id)continue
			buf.short(e.id)
			buf.short((e.x % 64 + 64) * 1024)
			buf.short((e.y % 64 + 64) * 1024)
			buf.int(e._id | 0)
			buf.short(e._id / 4294967296 | 0)
			buf.float(e.dx)
			buf.float(e.dy)
			buf.float(e.f)
			if(e._.savedata)buf.write(e._.savedata, e)
		}
		buf.short(0)
		for(let i = 0; i < palette.length; i++){
			buf.short(palette[i])
		}
		//encode data
		if(palette.length < 2);
		else if(palette.length == 2){
			for(let i = 0; i < 4096; i+=8){
				buf.byte(((this.tiles[i].id == palette[1]) << 0)
				| ((this.tiles[i + 1].id == palette[1]) << 1)
				| ((this.tiles[i + 2].id == palette[1]) << 2)
				| ((this.tiles[i + 3].id == palette[1]) << 3)
				| ((this.tiles[i + 4].id == palette[1]) << 4)
				| ((this.tiles[i + 5].id == palette[1]) << 5)
				| ((this.tiles[i + 6].id == palette[1]) << 6)
				| ((this.tiles[i + 7].id == palette[1]) << 7))
			}
		}else if(palette.length <= 4){
			for(let i = 0; i < 4096; i+=4){
				buf.byte(palette2[this.tiles[i].id]
				| (palette2[this.tiles[i + 1].id] << 2)
				| (palette2[this.tiles[i + 2].id] << 4)
				| (palette2[this.tiles[i + 3].id] << 6))
			}
		}else if(palette.length <= 16){
			for(let i = 0; i < 4096; i+=2){
				buf.byte(palette2[this.tiles[i].id]
				| (palette2[this.tiles[i + 1].id] << 4))
			}
		}else if(palette.length <= 256){
			for(let i = 0; i < 4096; i++){
				buf.byte(palette2[this.tiles[i].id])
			}
		}else{
			let j = 0
			for(let i = 0; i < 6144; i+=3, j+=2){
				buf.byte(palette2[this.tiles[j].id])
				buf.byte(palette2[this.tiles[j + 1].id])
				buf.byte((palette2[this.tiles[j].id] >> 8) | ((palette2[this.tiles[j + 1].id] >> 4) & 0xF0))
			}
		}
		//save block entities
		for(let i = 0; i < 4096; i++){
			let type = this.tiles[i]._.savedata
			if(!type)continue
		}
		return buf
	}
	static of(block, x, y, w){
		return new Chunk(new DataReader(Uint8Array.of(16, x >> 24, x >> 16, x >> 8, x, y >> 24, y >> 16, y >> 8, y, 0, 0, block.id >> 8, block.id)), w)
	}
	[Symbol.for('nodejs.util.inspect.custom')](){return '<Chunk x: '+this.x+' y: '+this.y+'>'}
}
