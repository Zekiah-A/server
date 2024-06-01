import { Items } from '../../items/item.js'
import { peekdown, peekleft, peekright, place } from '../../misc/ant.js'
import { Block, Blocks } from '../block.js'

Blocks.torch = class extends Block{
	static solid = false
	static breaktime = 0
	static blast = 15
	static targettable = true
	static replaceable = true
	static blockShape = [7/16, 0, 9/16, 10/16]
	drops(){ return new Items.torch() }
	update(){
		if(!peekdown().solid) this.destroy(), place(Blocks.air)
	}
}
Blocks.torch_left = class extends Blocks.torch{
	static blockShape = [12/16, 3/16, 1, 13/16]
	update(){
		if(!peekleft().solid) this.destroy(), place(Blocks.air)
	}
}
Blocks.torch_right = class extends Blocks.torch{
	static blockShape = [0, 3/16, 4/16, 13/16]
	update(){
		if(!peekright().solid) this.destroy(), place(Blocks.air)
	}
}