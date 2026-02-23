const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seed() {
    const uri = 'mongodb://localhost:27017/invest_flow';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('invest_flow');

        // 1. Clear existing test data to avoid duplicates
        await db.collection('users').deleteMany({ email: { $in: ['rahul@investor.com', 'priya@investor.com'] } });
        await db.collection('projects').deleteMany({});

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash('password123', salt);

        // 2. Create Users
        const rahul = await db.collection('users').insertOne({
            email: 'rahul@investor.com',
            passwordHash,
            name: 'Rahul Sharma',
            role: 'investor',
            kycVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const priya = await db.collection('users').insertOne({
            email: 'priya@investor.com',
            passwordHash,
            name: 'Priya',
            role: 'investor',
            kycVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Users created:', { rahulId: rahul.insertedId, priyaId: priya.insertedId });

        // 3. Create Projects
        const project1 = await db.collection('projects').insertOne({
            name: 'Skyline Residences',
            type: 'real_estate',
            description: 'Luxury apartments in downtown Mumbai.',
            targetAmount: 5000000,
            raisedAmount: 2500000,
            minInvestment: 50000,
            riskLevel: 'low',
            status: 'active',
            createdBy: rahul.insertedId,
            investors: [
                {
                    user: rahul.insertedId,
                    role: 'active',
                    investedAmount: 50000,
                    privacySettings: { isAnonymous: false, displayName: 'Rahul Sharma' }
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const project2 = await db.collection('projects').insertOne({
            name: 'Emerald Bay',
            type: 'real_estate',
            description: 'Waterfront villas in Goa.',
            targetAmount: 8000000,
            raisedAmount: 1200000,
            minInvestment: 100000,
            riskLevel: 'medium',
            status: 'active',
            createdBy: rahul.insertedId,
            investors: [
                {
                    user: rahul.insertedId,
                    role: 'active',
                    investedAmount: 100000,
                    privacySettings: { isAnonymous: false, displayName: 'Rahul Sharma' }
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const project3 = await db.collection('projects').insertOne({
            name: 'Ruby Tower',
            type: 'real_estate',
            description: 'Commercial space in Bangalore.',
            targetAmount: 12000000,
            raisedAmount: 5000000,
            minInvestment: 500000,
            riskLevel: 'high',
            status: 'active',
            createdBy: priya.insertedId,
            investors: [
                {
                    user: rahul.insertedId,
                    role: 'active',
                    investedAmount: 500000,
                    privacySettings: { isAnonymous: false, displayName: 'Rahul Sharma' }
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Projects created:', {
            skyline: project1.insertedId,
            emerald: project2.insertedId,
            ruby: project3.insertedId
        });
        console.log('SEEDING COMPLETE. Use email: rahul@investor.com / password: password123');

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

seed();
