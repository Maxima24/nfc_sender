import { seedUsers } from "./seeds/user.seed"

 async function main(){
    await seedUsers()
}

 main()