const axios = require("axios");
const config = require("../config.json");
const moment = require("moment");

module.exports.discordNotify = async(data) => {

    let tracks = "";

    if (typeof data.trackInfo === "string") data.trackInfo = JSON.parse(data.trackInfo);
    if (typeof data.trains === "string") data.trains = JSON.parse(data.trains); 
    if (typeof data.reason === "string") data.reason = JSON.parse(data.reason); 

    await data.trackInfo.forEach(element => {
        Object.entries(element).forEach(entry => {
            const [key, value] = entry;
            tracks += `Trať ${key}: úsek ${value}\n`
        })
    });

    let color, type
    
    if (data.cdType === "mimoradnost") color = config.discordWebhook.colors.extraordinary, type = "Mimořádnost";
    else if (data.cdType === "vyluka") color = config.discordWebhook.colors.exclusion, type = "Výluka";

    const json = {
        "content": null,
        "embeds": [
            {
                "title": `<:mvh:831133816974082049> MimoViewHistory • ${type} #${data.cdId}`,
                "description": 
                    "**Začátek události**: " +
                    moment(data.creationDate, "YYYY-MM-DD HH:mm:ss", true).format("D.M.YYYY HH:mm") + 
                    "\n**Předpokládaný konec události**: " +
                    moment(data.expectedEnd, "YYYY-MM-DD HH:mm:ss", true).format("D.M.YYYY HH:mm") + 
                    "\n**Tratě a úseky:**\n" +
                    tracks +
                    "**Důvody události:**\n" + 
                    data.reason.join("\n") +
                    `\n\n[MimoViewHistory](https://mvh.dobes.pw/#${data.cdId}) • ` +
                    `[České Dráhy](https://www.cd.cz/jizdni-rad/omezeni-provozu/${data.cdType}/${data.cdId}/)`,
                "color": color
            }
        ]
    };

    try {
        if (config.discordWebhook.enabled === true){
            await axios.post(config.discordWebhook.url, json);
            return true;
        } 
        else return false
    }catch (e){
        throw new Error ("Something went wrong while sending an Discord Webhook message.")
    }

}