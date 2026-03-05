const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const requireEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

async function seedAdmin() {
    try {
        const mongoUri = requireEnv('MONGODB_URI');
        const email = requireEnv('SEED_ADMIN_EMAIL');
        const password = requireEnv('SEED_ADMIN_PASSWORD');
        const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
        const role = process.env.SEED_ADMIN_ROLE || 'super_admin';

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

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
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        };

        await mongoose.connection.db.collection('users').insertOne(adminUser);
        console.log('--- ADMIN USER SEEDED ---');
        console.log(`Email: ${email}`);
        console.log(`Role: ${role}`);
        console.log('-------------------------');

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

seedAdmin();
