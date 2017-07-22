var calculateSeed = function(z11seed, amplified) {
	if(amplified) {
		var seed = bigInt(z11seed, 10);
		// Thanks to Grimy, works as of replay version 84
		seed = seed.add(0x40005e47).times(0xd6ee52a).mod(0x7fffffff).mod(0x713cee3f);
		return seed.value;
	} else {
		var period = bigInt(4294967296);
		var seed = bigInt(z11seed, 10).minus(6);
		while(bigInt(0).greater(seed)) {
			seed = seed.add(period);
		}
		seed = seed.times(492935547).mod(period);
		if(seed.greaterOrEquals(2147483648)) {
			seed = seed.minus(period);
		}
		return seed.value;
	}
};

var formatTime = function(ms) {
	var formatedTime = '',
		mDate = moment(ms);
	mDate.utc();
	var	hours = mDate.hour(),
		minutes = mDate.minute(),
		seconds = mDate.second(),
		mseconds = mDate.millisecond();
	if(hours > 0) {
		formatedTime += (hours<10?'0':'') + hours;
	}
	if(minutes > 0 || formatedTime) {
		formatedTime += (formatedTime?':':'') + (minutes<10?'0':'') + minutes;
	}
	if(seconds > 0 || formatedTime) {
		formatedTime += (formatedTime?':':'') + (seconds<10?'0':'') + seconds;
	}
	if(mseconds > 0 || formatedTime) {
		formatedTime += (formatedTime?'.':'') + (mseconds<100?'0':'') + mseconds;
	}

	return formatedTime;
};

var getZoneForChar = function(songs, char1, type, infos) {
	var numType = parseInt(type, 10);
	var nbZones = infos.amplified ? 5 : 4;
	switch(char1) {
		case '0': //cadence
		case '1': //melody
		case '2': //aria
		case '3': //dorian
		case '4': //eli
		case '5': //monk
		case '7': //coda
		case '8': //bolt
		case '9': //bard
		case '10': //nocturna
		case '11': //diamond
		case '12': //mary
		case '13': //tempo
			var zone = (numType < 5 && numType > 0) ? numType : Math.floor((songs-1)/4) + 1,
				floor = ((songs-1) % 4) + 1;
			if(char1 === '2' && (numType >= nbZones+1 || numType < 5)) zone = (nbZones+1) - zone;
			if(zone > nbZones) {
				if(zone > nbZones+1 || floor > 2) {
					infos.bugged = 'NB_SONGS';
					infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.';
				}
				zone = nbZones;
				floor = 5;
			} else if(zone < 1) { // For aria
				infos.bugged = 'NB_SONGS';
				infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.';
				zone = 1;
				floor = 4;
			}
			return zone + '-' + floor;
		case '6': //dove
			return (numType < nbZones+1 && numType > 0 ? numType : (Math.floor((songs-1)/3) + 1)) + '-' +(((songs-1) % 3) + 1);
	}
};

var getCharName = function(n) {
	switch(n) {
		case '0': return 'cadence';
		case '1': return 'melody';
		case '2': return 'aria';
		case '3': return 'dorian';
		case '4': return 'eli';
		case '5': return 'monk';
		case '6': return 'dove';
		case '7': return 'coda';
		case '8': return 'bolt';
		case '9': return 'bard';
		case '10': return 'nocturna';
		case '11': return 'diamond';
		case '12': return 'mary';
		case '13': return 'tempo';
	}
}
var getTypeName = function(n, amplified, splitedData, infos) {
	switch(n) {
		case '1': 
			if(infos && infos.name10) {
				var n = infos.name10;
				delete infos.name10;
				return getTypeName(n, true, splitedData, infos);
			}
			return 'Zone 1';
		case '2': return 'Zone 2';
		case '3': return 'Zone 3';
		case '4': return 'Zone 4';
		case '5': return ((amplified && parseInt(splitedData[1], 10) == 5) || (infos.amplifiedFullRelease && parseInt(splitedData[2], 10) == 5)) ? 'Zone 5' : 'Dance Pad';
		case '-7': case '6': return 'All-Zones';
		case '-8': return 'Dance Pad';
		case '-9': case '7': return 'Daily';
		case '-10': case '8': return 'Seeded All-Zones';
		case '-50': return 'Story Mode';
		case '-52': return 'No Return';
		case '-53': return 'Seeded No Return';
		case '-55': return 'Hard Mode';
		case '-56': return 'Seeded Hard Mode';
		case '-59': return 'Phasing';
		case '-60': return 'Randomizer';
		case '-61': return 'Mystery';
		case '-62': return 'Seeded Phasing';
		case '-63': return 'Seeded Randomizer';
		case '-64': return 'Seeded Mystery';
		default: return 'Unknown';
	}
}


var showData = function(data, splitedData) {
	var html = '<ul>';

	if(data.seed && (!data.type || parseInt(data.type, 10) > 5 || parseInt(data.type, 10) < 1)) {
		html += '<li><label>Seed:</label> '+data.seed+'</li>';
	}
	if(data.char1) {
		html += '<li><label>Character:</label> '+getCharName(data.char1)+'</li>';
	}
	if(data.char2) {
		html += '<li><label>Second Character:</label> '+getCharName(data.char2)+'</li>';
	}
	if(data.type) {
		html += '<li><label>Type:</label> '+getTypeName(data.type, data.amplified, splitedData, data)+'</li>';
	}
	if(data.formatedTime) {
		html += '<li><label>Time:</label> '+data.formatedTime+'</li>';
	}
	if(data.endZone) {
		html += '<li><label>End Zone:</label> '+data.endZone+'</li>';
	}
	if(data.date && !isNaN(data.date.getTime())) {
		html += '<li><label>Replay date:</label> '+data.date+'</li>';
	}

	document.getElementById('output').innerHTML = html + '</ul>';
};

var getSplitIndex = function(infos, index) {
	if(infos.amplifiedFullRelease) {
		return index - 3;
	}
	return index;
}

var parseReplayFile = function(file) {
	var infos = {},
		filename = file.name
		name = filename.replace('.dat', ''),
		splitName = name.split('_');
	infos.version = splitName[0];
	infos.amplified = parseInt(infos.version, 10) > 75;
	infos.amplifiedFullRelease = parseInt(infos.version, 10) > 84;
	infos.filename = file.name;
	infos.date = new Date(
		parseInt(splitName[3], 10),
		parseInt(splitName[4], 10) - 1,
		parseInt(splitName[5], 10),
		parseInt(splitName[6], 10),
		parseInt(splitName[7], 10),
		parseInt(splitName[8], 10)
	);
	infos.type = splitName[9];

	if(infos.amplifiedFullRelease) {
		infos.name10 = splitName[10];
	}

	var reader = new FileReader();
	reader.onload = function(theFile) {
		data = theFile.currentTarget.result
		var splitedData = data.split('\\n');
		if(splitedData[getSplitIndex(infos, 8)]) {
			infos.time = parseInt(splitedData[getSplitIndex(infos, 8)], 10);
			infos.formatedTime = formatTime(infos.time);
		}
		if(splitedData[getSplitIndex(infos, 10)]) infos.seed = calculateSeed(splitedData[getSplitIndex(infos, 10)], infos.amplified);
		if(splitedData[getSplitIndex(infos, 11)]) infos.players = parseInt(splitedData[getSplitIndex(infos, 11)], 10);
		if(splitedData[getSplitIndex(infos, 17)]) infos.char1 = splitedData[getSplitIndex(infos, 15)].split('|')[0];
		if(infos.players > 1 && splitedData[getSplitIndex(infos, 17)]) {
			infos.char2 = splitedData[getSplitIndex(infos, 17)].split('|')[0];
		}
		if(splitedData[getSplitIndex(infos, 9)]) {
			infos.songs = parseInt(splitedData[getSplitIndex(infos, 9)], 10);
			infos.endZone = getZoneForChar(parseInt(splitedData[getSplitIndex(infos, 9)], 10), infos.char1, infos.type, infos);
		}
		console.log(infos);
		showData(infos, splitedData);
	};

	reader.readAsText(file);

};




var dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', function(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
}, false);
dropZone.addEventListener('drop', function(e) {
	e.stopPropagation();
	e.preventDefault();
	parseReplayFile(e.dataTransfer.files[0]);
}, false);