var express = require('express');
var app = express();
var requestModule = require("request")
var numeral = require("numeral")

app.get('/', function (req, res) {
	// TODO: show help instead
	res.send("Use <a href='team/29238'>team/29238</a>")
});

app.get('/team/:teamID', function (req, res) {
	getTeamInfo(req.params.teamID, function(teamInfo) {
		res.send(JSON.stringify(teamInfo))
	});
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

// Important URLs
var teamGoalURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.team&format=json&teamID=";
var teamRosterURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.teamParticipants&format=json&teamID=";
var individualGoalURLPrefix = "http://www.extra-life.org/index.cfm?fuseaction=donorDrive.participant&format=json&participantID=";


function getTeamInfo(teamID, completion) {
	requestModule({ url: teamGoalURLPrefix + teamID }, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var teamInfo = JSON.parse(body);

			if (teamInfo.teamID > 0) {
				// Format the dollar amounts
				teamInfo.totalRaisedAmountFormatted = numeral(teamInfo.totalRaisedAmount).format('$0');
				teamInfo.fundraisingGoalFormatted = numeral(teamInfo.fundraisingGoal).format('$0');

				// Calculate percentage toward goal
				if (teamInfo.fundraisingGoal > 0) {
					teamInfo.percentageTowardGoal = teamInfo.totalRaisedAmount / teamInfo.fundraisingGoal;
				} else {
					teamInfo.percentageTowardGoal = 0;
				}
					
				teamInfo.members = [];
				getRosterForTeam(teamInfo, completion);
			} else {
				completion({error: "Failed to fetch team"})
			}
		} else {
			completion({error: error})
		}
	});
}

/**
 * teamInfo: Existing team object
 * completion: Completion function. Takes an object.
 */
function getRosterForTeam(teamInfo, completion) {
	var rosterURL = teamRosterURLPrefix + teamInfo.teamID
	requestModule({ url: rosterURL }, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var peopleArray = JSON.parse(body);
			if (peopleArray) {
				loadAllMembersIntoTeam(teamInfo, peopleArray, 0, completion);
			} else {
				// Failed to fetch team members, but at least we have the team info
				completion(teamInfo)
			}
		} else {
			completion({error: error})
		}
	});
}

/**
 * teamInfo: Existing team object
 * peopleArray: Array of participant objects
 * startIndex: Index to start looping from
 * completion: Completion function. Takes an object.
 */
function loadAllMembersIntoTeam(teamInfo, peopleArray, startIndex, completion) {
	if (startIndex >= peopleArray.length) {
		completion(teamInfo)
	} else {
		var person = peopleArray[startIndex];
		fetchParticipant(person.participantID, function(participantObject) {
			if (participantObject) {
				teamInfo.members.push(participantObject);
			}

			// Fetch the next person
			loadAllMembersIntoTeam(teamInfo, peopleArray, startIndex + 1, completion);
		});
	}
}

/**
 * participantID: ID of the participant to load
 * completion: Completion block. Takes the participant object
 */
function fetchParticipant(participantID, completion) {
	var personURL = individualGoalURLPrefix + participantID;
		requestModule({ url: personURL }, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var individualInfo = JSON.parse(body);

				if (individualInfo) {
					// Format the dollar amounts
					individualInfo.totalRaisedAmountFormatted = numeral(individualInfo.totalRaisedAmount).format('$0');
					individualInfo.fundraisingGoalFormatted = numeral(individualInfo.fundraisingGoal).format('$0');

					// Calculate percentage toward goal
					if (individualInfo.fundraisingGoal > 0) {
						individualInfo.percentageTowardGoal = individualInfo.totalRaisedAmount / individualInfo.fundraisingGoal;
					} else {
						individualInfo.percentageTowardGoal = 0;
					}
				}

				completion(individualInfo);
			} else {
				completion();
			}
		});
}
