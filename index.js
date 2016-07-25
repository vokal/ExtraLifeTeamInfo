var express = require('express');
var app = express();
var requestModule = require("request")

// TODO: take this from a URL query param
var teamID = 29238

app.get('/', function (req, res) {
	getTeamInfo(teamID, function(teamInfo) {
		res.send(JSON.stringify(teamInfo))
	});
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


// Important URLs
var teamGoalURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.team&format=json&teamID=";
var teamRosterURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.teamParticipants&format=json&teamID=";
var individualGoalURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.participant&format=json&participantID=";


function getTeamInfo(teamID, completion) {
	requestModule({ url: teamGoalURLPrefix + teamID }, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var teamInfo = JSON.parse(body);
			teamInfo.members = [];
			getRosterForTeam(teamInfo, completion);
		} else {
			// TODO: handle error
			console.log(error);
		}
	});
}

function getRosterForTeam(teamInfo, completion) {
	var rosterURL = teamRosterURLPrefix + teamInfo.teamID
	requestModule({ url: rosterURL }, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var peopleArray = JSON.parse(body);
			getIndividualInfo(teamInfo, peopleArray, 0, completion);
		} else {
			// TODO: handle error
			console.log(error);
		}
	});
}

function getIndividualInfo(teamInfo, peopleArray, startIndex, completion) {
	if (startIndex >= peopleArray.length) {
		completion(teamInfo)
	} else {
		var person = peopleArray[startIndex];
		var personURL = individualGoalURLPrefix + person.participantID;
		requestModule({ url: personURL }, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var individualInfo = JSON.parse(body);

				// Calculate percentage toward goal
				if (individualInfo.fundraisingGoal > 0) {
					individualInfo.percentageTowardGoal = individualInfo.totalRaisedAmount / individualInfo.fundraisingGoal;
				} else {
					individualInfo.percentageTowardGoal = 0;
				}

				teamInfo.members.push(individualInfo);

				// Fetch the next person
				getIndividualInfo(teamInfo, peopleArray, startIndex + 1, completion);
			} else {
				// TODO: handle error
				console.log(error);
			}
		});
	}
}
