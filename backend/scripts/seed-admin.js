const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seedAdmin() {
    try {
        await mongoose.connect('mongodb://localhost:27017/invest_flow');
        console.log('Connected to MongoDB');

        const email = 'admin@splitflow.com';
        const password = 'admin123';
        const name = 'Super Admin';
        const role = 'super_admin';

        // Check if admin exists
        const existing = await mongoose.connection.db.collection('users').findOne({ email });
        if (existing) {
            console.log('Admin user already exists. Skipping...');
            await mongoose.disconnect();
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const adminUser = {
            email,
            passwordHash,
            name,
            role,
            kycVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        };

        await mongoose.connection.db.collection('users').insertOne(adminUser);
        console.log('--- ADMIN USER SEEDED ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('-------------------------');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

seedAdmin();
