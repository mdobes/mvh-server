const cd = require("./modules/cd");
const connection = require("./modules/mysql");
const dc = require("./modules/discord");


(async () => {
    let result = await cd.fetchAllEvents();
    console.log(result);
    result.forEach(async (item) => {
        try {
            await dc.discordNotify(item);
            await connection.query(
                "INSERT INTO cztrains_restrictions (cdId, type, trackInfo, creationDate, expectedEnd, reason, trains," +
                "comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [item.cdId, item.type, JSON.stringify(item.trackInfo), item.creationDate, 
                item.expectedEnd, JSON.stringify(item.reason), JSON.stringify(item.trains), item.comment]);
        }catch(e){
            console.log(e);
        }
        
    })
})();
