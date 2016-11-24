var calculateSeed = function(z11seed) {
	var period = bigInt(4294967296);
	var seed = bigInt(z11seed, 10).minus(6);
	while(bigInt(0).greater(seed)) {
		seed = seed.add(period);
	}
	seed = seed.times(492935547).mod(period);
	if(seed.greaterOrEquals(2147483648)) {
		seed =  seed.minus(period);
	}
	return seed.value;
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
			var zone = numType < 5 ? numType : Math.floor((songs-1)/4) + 1,
				floor = ((songs-1) % 4) + 1;
			if(char1 === '2' && numType >= 5) zone = 5 - zone;
			if(zone > 4) {
				if(zone > 5 || floor > 2) {
					infos.bugged = 'NB_SONGS';
					infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.';
				}
				zone = 4;
				floor = 5;
			} else if(zone < 1) { // For aria
				infos.bugged = 'NB_SONGS';
				infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.';
				zone = 1;
				floor = 4;
			}
			return zone + '-' + floor;
		case '6': //dove
			return (numType < 5 ? numType : (Math.floor((songs-1)/3) + 1)) + '-' +(((songs-1) % 3) + 1);
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
	}
}
var getTypeName = function(n) {
	switch(n) {
		case '1': return 'Zone 1';
		case '2': return 'Zone 2';
		case '3': return 'Zone 3';
		case '4': return 'Zone 4';
		case '5': return 'Dance Pad';
		case '6': return 'All-Zones';
		case '7': return 'Daily';
		case '8': return 'Seeded All-Zones';
		default: return 'Unknown'
	}
}


var showData = function(data) {
	var html = '<ul>';

	if(data.seed && (!data.type || parseInt(data.type, 10) > 5)) {
		html += '<li><label>Seed:</label> '+data.seed+'</li>';
	}
	if(data.char1) {
		html += '<li><label>Character:</label> '+getCharName(data.char1)+'</li>';
	}
	if(data.char2) {
		html += '<li><label>Second Character:</label> '+getCharName(data.char2)+'</li>';
	}
	if(data.type) {
		html += '<li><label>Type:</label> '+getTypeName(data.type)+'</li>';
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

var parseReplayFile = function(file) {
	var infos = {},
		filename = file.name
		name = filename.replace('.dat', ''),
		splitName = name.split('_');
	infos.version = splitName[0];
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

	var reader = new FileReader();
	reader.onload = function(theFile) {
		data = theFile.currentTarget.result
		var splitedData = data.split('\\n');
		if(splitedData[8]) {
			infos.time = parseInt(splitedData[8], 10);
			infos.formatedTime = formatTime(infos.time);
		}
		if(splitedData[10]) infos.seed = calculateSeed(splitedData[10]);
		if(splitedData[11]) infos.players = parseInt(splitedData[11], 10);
		if(splitedData[17]) infos.char1 = splitedData[15].substr(0,1);
		if(infos.players > 1 && splitedData[17]) {
			infos.char2 = splitedData[17].substr(0,1);
		}
		if(splitedData[9]) {
			infos.songs = parseInt(splitedData[9], 10);
			infos.endZone = getZoneForChar(parseInt(splitedData[9], 10), infos.char1, infos.type, infos);
		}
		console.log(infos);
		showData(infos);
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