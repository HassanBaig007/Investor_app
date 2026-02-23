const mongoose = require('mongoose');

async function checkUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/invest_flow');
        const users = await mongoose.connection.db.collection('users').find().toArray();
        console.log('--- USERS IN DATABASE ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
        });
        console.log('-------------------------');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

checkUsers();
