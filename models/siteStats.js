const mongoose = require('mongoose');

const siteStatsSchema = new mongoose.Schema({
    identifier: {
        type: String,
        default: 'main_stats',
        unique: true
    },
    totalVisits: {
        type: Number,
        default: 0
    },
    todayDate: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    todayVisits: {
        type: Number,
        default: 0
    },
    lastVisitAt: {
        type: Date,
        default: Date.now
    }
});

// Helper static method to record a visit atomically
siteStatsSchema.statics.recordVisit = async function() {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Try atomic update if todayDate is already today
    let stats = await this.findOneAndUpdate(
        { identifier: 'main_stats', todayDate: today },
        { 
            $inc: { totalVisits: 1, todayVisits: 1 },
            $set: { lastVisitAt: new Date() }
        },
        { new: true }
    );
    
    if (stats) {
        return stats;
    }

    // 2. If no doc matched todayDate, check if main_stats exists
    stats = await this.findOne({ identifier: 'main_stats' });
    if (!stats) {
        try {
            stats = await this.create({
                identifier: 'main_stats',
                totalVisits: 1,
                todayDate: today,
                todayVisits: 1,
                lastVisitAt: new Date()
            });
            return stats;
        } catch (e) {
            // Race condition fallback
            return await this.findOneAndUpdate(
                { identifier: 'main_stats' },
                { 
                    $inc: { totalVisits: 1 },
                    $set: { todayDate: today, todayVisits: 1, lastVisitAt: new Date() }
                },
                { new: true, upsert: true }
            );
        }
    }

    // 3. Document exists, but date changed to a new day -> reset todayVisits to 1
    stats = await this.findOneAndUpdate(
        { identifier: 'main_stats' },
        { 
            $inc: { totalVisits: 1 },
            $set: { todayDate: today, todayVisits: 1, lastVisitAt: new Date() }
        },
        { new: true }
    );
    return stats;
};

module.exports = mongoose.model('SiteStats', siteStatsSchema);
