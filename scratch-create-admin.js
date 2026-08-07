const mongoose = require('mongoose');
const argon2 = require('argon2');

async function run() {
  try {
    await mongoose.connect('mongodb+srv://lizbethtoroshina_db_user:zxULPUvnIwdkqxi0@trigalcluster.aebjm3l.mongodb.net/?appName=TrigalCluster');
    const hash = await argon2.hash('Eltrigal@2026!');
    
    await mongoose.connection.collection('users').updateOne(
      { email: 'admin@eltrigal.com' },
      {
        $set: {
          email: 'admin@eltrigal.com',
          firstName: 'Admin',
          lastName: 'Pruebas',
          role: 'OWNER',
          status: 'active',
          passwordHash: hash,
          failedLoginAttempts: 0,
          sessionVersion: 1
        }
      },
      { upsert: true }
    );
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
