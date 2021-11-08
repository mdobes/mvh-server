const axios = require("axios")
const cheerio = require("cheerio")
const moment = require("moment");

String.prototype.clearText = function () {
	return this.replace(/[\n\t\r]/g,"").trim();
};

String.prototype.commentReplace = function () {
	return this.replace('<h4 style="font-size: 16px;"><strong>Popis:</strong></h4>', '<span class="title-muted">Popis</span>')
			.replace('<h3 class="h4faq">Obecné opatření v dálkové dopravě</h3>', '<span class="title-muted">Obecné opatření v dálkové dopravě</span>')
			.replace('<h3 class="h4faq mt50">Poznámka</h3>', '<span class="title-muted">Poznámka</span>');
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
  
const fetchDetail = async (type, id) => {
	let $ = await fetchHTML(`https://www.cd.cz/jizdni-rad/omezeni-provozu/${type}/${id}/`);

	let array = {};
	try {
		array.trains = [];
		$("a[class='cd-btn-blue-xs btn-or']").each((i, e) => {
			let train = $(e).text().clearText().split(" ")[1];
			if (!array["trains"].includes(train)) array["trains"].push(train);
        });;
		array.reasons = $("p[title='Důvody a příčiny']").text()?.clearText() || $("p[title='Příčina']").text()?.clearText();
		array.reasons = array.reasons.split(",");
		array.regions = $("p.rline.imap").text()?.clearText();
		array.regions = array.regions.split(", ");
		$(".but-box").remove();
		$(".obox").remove();
		$(".trc.trm1.nad").remove();
		$(".blnfo").remove();
		$(".h4faq:contains('Odkazy na podrobnosti')").remove();
		$(".blink.block").remove();
		$(".reset").remove();
		let comment = $("div[class='traficRestrictions']").html().clearText().replace(/\>[\t ]+\</g, "><").commentReplace();
		array.comment = comment;
		return array;
	}catch (e){
		throw Error(e);
	}
}


(async () => {
	let $ = await fetchHTML(`https://www.cd.cz/jizdni-rad/omezeni-provozu/`);
	$(".panel").each(async (i, e) => {
		let array = {};
		let url = $(e).find(".tr-mess").attr("href").replace("/jizdni-rad/omezeni-provozu/", "").split("/");
		array.cdId = url[1];
		array.type = url[0];
		if (array.type !== "zahranicni-vyluka" && array.type !== "zahranicni-mimoradnost"){
			let track = $(e).find("h3[class=title] > span").text().replace(/úsek/g, "").split("Trať ").filter(value => Object.keys(value).length !== 0);
			track.forEach((e, i) => {
				let section = e.split(":");
				track[i] = {[section[0].trim()]: section[1].trim()}
			});
			let time = $(e).find("span[class=desc]").html();
			array.track = track;
			array.time = time; 

			if (array.type === "vyluka"){
				array.time = array.time.arrReplace(["Výluka, ", "počátek od ", " Plánovaný konec: ", "\r\n Neplánovaná výluka"], [""]);
				array.time = array.time.split("/");
			}else if (array.type === "mimoradnost"){
				array.time = array.time.arrReplace(["Počátek: ", " Plánovaný konec: "], [""]);
				array.time = array.time.split("<br>");
				array.time = array.time[1].split("/");
			}
			array.time = array.time.trimArray();

			array.creationDate = moment(array.time[0], "DD.MM.YYYY HH:mm", true).format("YYYY-MM-DD HH:mm:ss");
			array.expectedEnd = moment(array.time[1], "DD.MM.YYYY HH:mm", true).format("YYYY-MM-DD HH:mm:ss");
			
			const info = await fetchDetail(array.type, array.cdId);
			let mergedArray = {...array, ...info}
			
			console.log(mergedArray);
		}
	});
})();
