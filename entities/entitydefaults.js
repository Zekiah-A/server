export default {
	id: -1, name: "",
	maxhealth: 20,
	died(){},
	moved(oldx, oldy, oldw){},
	rubber(){},
	damage(amount){
		this.health -= amount
		if(this.health < 0){
			this.died()
			this.remove()
		}else if(this.health > this.maxhealth){
			this.health = this.maxhealth
		}
	}
}