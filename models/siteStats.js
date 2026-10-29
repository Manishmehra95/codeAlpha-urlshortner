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

// Helper static method to record a visit
siteStatsSchema.statics.recordVisit = async function() {
    const today = new Date().toISOString().split('T')[0];
    let stats = await this.findOne({ identifier: 'main_stats' });
    
    if (!stats) {
        stats = new this({
            identifier: 'main_stats',
            totalVisits: 1,
            todayDate: today,
            todayVisits: 1,
            lastVisitAt: new Date()
        });
        await stats.save();
        return stats;
    }

    stats.totalVisits += 1;
    if (stats.todayDate === today) {
        stats.todayVisits += 1;
    } else {
        stats.todayDate = today;
        stats.todayVisits = 1;
    }
    stats.lastVisitAt = new Date();
    await stats.save();
    return stats;
};

module.exports = mongoose.model('SiteStats', siteStatsSchema);
