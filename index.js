const config = require("./config.json");
const cd = require("./modules/cd");
const connection = require("./modules/mysql");
const dc = require("./modules/discord");

const CronJob = require('cron').CronJob;
const job = new CronJob(config.cron.time, async () => {
    let result = await cd.fetchAllEvents();
    result.forEach(async (item) => {
        try {
            await connection.query(
                "INSERT INTO cztrains_restrictions (cdId, type, trackInfo, creationDate, expectedEnd, reason, trains," +
                "comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [item.cdId, item.type, JSON.stringify(item.trackInfo), item.creationDate, 
                item.expectedEnd, JSON.stringify(item.reason), JSON.stringify(item.trains), item.comment]);
            await dc.discordNotify(item);
        }catch(e){
            console.log(e);
        }

    })
}, null, true, config.cron.timezone);
job.start();