import { userController } from '../sdk/userModule'

async function main() {
  console.log('1. List of users before:')

  const usersBefore = await userController.getAll()
  console.log(usersBefore.map((user) => user.displayName))

  console.log('2. Creating a new user:')

  const num = Math.floor(Math.random() * 1000000000)
  console.log(
    await userController.create(
      {},
      {
        email: `test-user-${num}@test.com`,
        displayName: `Test User ${num}`,
        username: `test${num}`,
      }
    )
  )

  console.log('3. List of users after:')

  const usersAfter = await userController.getAll()
  console.log(usersAfter.map((user) => user.displayName))
}

main()
