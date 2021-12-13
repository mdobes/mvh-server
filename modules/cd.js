const axios = require("axios")
const cheerio = require("cheerio")
const moment = require("moment");
const connection = require("./mysql");

String.prototype.clearText = function () {
	return this.replace(/[\n\t\r]/g,"").trim();
};

String.prototype.commentReplace = function () {
	return this.replace('<h4 style="font-size: 16px;"><strong>Popis:</strong></h4>', '<span class="title-muted">Popis</span>')
			.replace('<h3 class="h4faq">Obecné opatření v dálkové dopravě</h3>', '<span class="title-muted">Obecné opatření v dálkové dopravě</span>')
			.replace('<h3 class="h4faq mt50">Obecné opatření v regionální dopravě</h3>', '<span class="title-muted">Obecné opatření v regionální dopravě</span>')
			.replace('<h3 class="h4faq mt50">Poznámka</h3>', '<span class="title-muted">Poznámka</span>')
			.replace('<h3 class="h4faq mt50">Soubory ke stažení</h3>', '');
};

String.prototype.arrReplace = function(find, replace) {
	let replaceString = this, regex;
	for (var i = 0; i < find.length; i++) {
	  regex = new RegExp(find[i], "g");
	  replaceString = replaceString.replace(regex, replace[0]);
	}
	return replaceString;
};

Array.prototype.trimArray = function () {
	return this.map(s => s.trim());
}

const fetchHTML = async (url) => {
	const { data } = await axios.get(url)
	return cheerio.load(data)
}

module.exports.eventExist = async (type, id) => {
	try {
		let result = await connection.query('SELECT cdId FROM cztrains_restrictions WHERE cdId = ?', [id]);
		if(result[0][0]) return true;
		else return false;
	}catch (e){
		if (config.devMode === true) console.log(e);
		throw Error(`Something went wrong while fetching event details. (Type: ${type}, id: ${id})`);
	}

}
  
module.exports.fetchDetail = async (type, id) => {
	let $ = await fetchHTML(`https://www.cd.cz/jizdni-rad/omezeni-provozu/${type}/${id}/`);

	let array = {};
	try {
		array.trains = [];
		$("a[class='cd-btn-blue-xs btn-or']").each((i, e) => {
			let train = $(e).text().clearText().split(" ")[1];
			if (!array["trains"].includes(train)) array["trains"].push(train);
        });;
		array.reason = $("p[title='Důvody a příčiny']").text()?.clearText() || $("p[title='Příčina']").text()?.clearText();
		array.reason = array.reason.split(",");
		array.regions = $("p.rline.imap").text()?.clearText();
		array.regions = array.regions.split(", ");
		$(".but-box").remove();
		$(".obox").remove();
		$(".trc.trm1.nad").remove();
		$(".blnfo").remove();
		$(".h4faq:contains('Odkazy na podrobnosti')").remove();
		$(".blink.block").remove();
		$(".reset").remove();
		$(".bdown.vd2").remove();
		let comment = $("div[class='traficRestrictions']").html().clearText().replace(/\>[\t ]+\</g, "><").commentReplace();
		array.comment = comment;
		return array;
	}catch (e){
		if (config.devMode === true) console.log(e);
		throw Error(`Something went wrong while fetching event details. (Type: ${type}, id: ${id})`);
	}
}

module.exports.fetchAllEvents = async () => {
	let retArray = [];
	let $ = await fetchHTML(`https://www.cd.cz/jizdni-rad/omezeni-provozu/`);
	let items = $(".panel").toArray();

	for(let i = 0; i < items.length; i++){
        const e = items[i];
		let array = {}, 
		url = $(e).find(".tr-mess").attr("href").replace("/jizdni-rad/omezeni-provozu/", "").split("/");

		array.cdId = url[1];
		array.cdType = url[0];

		if (await this.eventExist(null, array.cdId)) continue;
		if (array.cdType == "zahranicni-vyluka" || array.cdType == "zahranicni-mimoradnost") continue;

		let track = $(e).find("h3[class=title] > span").text().replace(/úsek/g, "").split("Trať ").filter(value => Object.keys(value).length !== 0);
		track.forEach((e, i) => {
			let section = e.split(":");
			track[i] = { [section[0].trim()]: section[1].trim() };
		});

		$(e).find("span[class=desc]").children(".text.title").remove();
		let time = $(e).find("span[class=desc]").html();
		
		array.trackInfo = track;
		array.time = time;

		if (array.cdType === "vyluka") {
			array.type = "exclusion";
			array.time = array.time.arrReplace(["<br>", "Výluka, ", "počátek od ", " Plánovaný konec: ", "\r\n Neplánovaná výluka"], [""]);
			array.time = array.time.split("/");
		} else if (array.cdType === "mimoradnost") {
			array.type = "extraordinary";
			array.time = array.time.arrReplace(["Počátek: ", " Plánovaný konec: "], [""]);
			array.time = array.time.split("<br>");
			array.time = array.time[1].split("/");
		}

		array.time = array.time.trimArray();
		array.creationDate = moment(array.time[0], "DD.MM.YYYY HH:mm", true).format("YYYY-MM-DD HH:mm:ss");
		array.expectedEnd = moment(array.time[1], "DD.MM.YYYY HH:mm", true).format("YYYY-MM-DD HH:mm:ss");

		const info = await this.fetchDetail(array.cdType, array.cdId);
		let mergedArray = { ...array, ...info };

		retArray.push(mergedArray);
    }

	return retArray;
}