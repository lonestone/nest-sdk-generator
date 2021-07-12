import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs'

const options: MikroOrmModuleSyncOptions = {
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  type: 'sqlite',
  dbName: 'demo-server-db.sqlite3',
  validate: true,
  strict: true,
}

export default options
