// FRC API Configuration - Check if constants are already defined (from search.js)
if (typeof TBA_AUTH_KEY === 'undefined') {
  const TBA_AUTH_KEY =
    "gdgkcwgh93dBGQjVXlh0ndD4GIkiQlzzbaRu9NUHGfk72tPVG2a69LF2BoYB1QNf";
}

if (typeof TBA_BASE_URL === 'undefined') {
  const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
}

// Use window-scoped variables to ensure consistent access across modules
window.TBA_AUTH_KEY = window.TBA_AUTH_KEY || "gdgkcwgh93dBGQjVXlh0ndD4GIkiQlzzbaRu9NUHGfk72tPVG2a69LF2BoYB1QNf";
window.TBA_BASE_URL = window.TBA_BASE_URL || "https://www.thebluealliance.com/api/v3";
window.FRC_TEAM_KEY = window.FRC_TEAM_KEY || "frc7790"; // Add team key definition

// Constant for the 37-hour offset (in milliseconds)
const OFFSET_MS = 37 * 3600 * 1000; // 37 hour offset

// Fetch event data by event code
async function fetchEventData(eventCode) {
  try {
    const response = await fetch(`${window.TBA_BASE_URL}/event/${eventCode}`, {
      headers: {
        "X-TBA-Auth-Key": window.TBA_AUTH_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching event: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching event data:", error);
    return null;
  }
}

// Helper function to format event dates
function formatEventDate(startDate, endDate) {
  if (!startDate) return "Date TBD";
  
  try {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = new Date(startDate).toLocaleDateString('en-US', options);
    
    if (!endDate) return start;
    
    const end = new Date(endDate).toLocaleDateString('en-US', options);
    return `${start} - ${end}`;
  } catch (e) {
    return startDate;
  }
}

// New function to calculate the next event automatically
async function getNextEvent() {
  try {
    const response = await fetch(
      `${window.TBA_BASE_URL}/team/${window.FRC_TEAM_KEY}/events/simple`,
      {
        headers: { "X-TBA-Auth-Key": window.TBA_AUTH_KEY },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const events = await response.json();
    const now = new Date();
    
    // Filter for upcoming or currently ongoing events
    const upcoming = events.filter((event) => {
      const eventEnd = new Date(event.end_date);
      eventEnd.setDate(eventEnd.getDate() + 1); // Include the end day
      return eventEnd >= now;
    });
    
    upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return upcoming[0];
  } catch (error) {
    console.error("Error fetching next event:", error);
    return null;
  }
}

// Update UI elements with loading state
function setLoadingState(isLoading) {
  const loadingElements = {
    ranking: {
      number: document.getElementById("ranking-number"),
      total: document.getElementById("total-teams"),
    },
    record: {
      wins: document.getElementById("wins"),
      losses: document.getElementById("losses"),
    },
    nextMatch: {
      number: document.getElementById("match-number"),
      time: document.getElementById("match-time"),
      blue: document.getElementById("blue-alliance"),
      red: document.getElementById("red-alliance"),
    },
  };

  if (isLoading && loadingElements.ranking.number) {
    loadingElements.ranking.number.textContent = "...";
    loadingElements.ranking.total.textContent = "Fetching data...";
    loadingElements.record.wins.textContent = "...";
    loadingElements.record.losses.textContent = "...";
    loadingElements.nextMatch.number.textContent = "Loading...";
    loadingElements.nextMatch.time.textContent = "Fetching schedule...";
    loadingElements.nextMatch.blue.textContent = "Loading alliance...";
    loadingElements.nextMatch.red.textContent = "Loading alliance...";
  }
}

// Handle errors gracefully
function setErrorState(element, message = "No data available") {
  const el = document.getElementById(element);
  if (el) {
    el.textContent = message;
  }
}

// Update rankings display with better error handling
async function updateRankings(eventKey) {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/rankings`, {
      headers: {
        "X-TBA-Auth-Key": TBA_AUTH_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const rankings = await response.json();
    const teamRanking = rankings.rankings.find(
      (r) => r.team_key === window.FRC_TEAM_KEY
    );

    if (teamRanking) {
      const rankingNumber = document.getElementById("ranking-number");
      const totalTeams = document.getElementById("total-teams");
      
      if (rankingNumber && totalTeams) {
        rankingNumber.textContent = teamRanking.rank;
        totalTeams.textContent = `of ${rankings.rankings.length} teams`;
      }
    } else {
      setErrorState("ranking-number", "--");
      setErrorState("total-teams", "Not ranked yet");
    }
  } catch (error) {
    console.error("Error fetching rankings:", error);
    setErrorState("ranking-number", "--");
    setErrorState("total-teams", "Rankings unavailable");
  }
}

// Update match record
async function updateRecord(eventKey) {
  try {
    const response = await fetch(
      `${window.TBA_BASE_URL}/team/${window.FRC_TEAM_KEY}/event/${eventKey}/matches`,
      {
        headers: {
          "X-TBA-Auth-Key": window.TBA_AUTH_KEY,
        },
      }
    );
    const matches = await response.json();

    let wins = 0;
    let losses = 0;

    matches.forEach((match) => {
      if (match.winning_alliance && match.actual_time) {
        const blueTeams = match.alliances.blue.team_keys;
        const redTeams = match.alliances.red.team_keys;
        
        const isOnBlue = blueTeams.includes(window.FRC_TEAM_KEY);
        const isOnRed = redTeams.includes(window.FRC_TEAM_KEY);
        
        if ((isOnBlue && match.winning_alliance === "blue") || 
            (isOnRed && match.winning_alliance === "red")) {
          wins++;
        } else if ((isOnBlue || isOnRed) && match.winning_alliance !== "") {
          losses++;
        }
      }
    });

    const winsEl = document.getElementById("wins");
    const lossesEl = document.getElementById("losses");
    
    if (winsEl && lossesEl) {
      winsEl.setAttribute("data-target", wins);
      lossesEl.setAttribute("data-target", losses);
      // Re-trigger counter animation
      runCounter(winsEl);
      runCounter(lossesEl);
    }
  } catch (error) {
    console.error("Error fetching match record:", error);
  }
}

// Update next match with better error handling
async function updateNextMatch(eventKey) {
  try {
    const response = await fetch(
      `${window.TBA_BASE_URL}/team/${window.FRC_TEAM_KEY}/event/${eventKey}/matches`,
      {
        headers: {
          "X-TBA-Auth-Key": window.TBA_AUTH_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const matches = await response.json();
    const nextMatch = matches.find(
      (match) => !match.actual_time && match.predicted_time
    );

    if (nextMatch) {
      // Format match number
      const matchNumEl = document.getElementById("match-number");
      if (matchNumEl) {
        matchNumEl.textContent = `Match ${nextMatch.match_number}`;
      }
      
      // Format match time
      const matchTimeEl = document.getElementById("match-time");
      if (matchTimeEl) {
        const matchTime = new Date(nextMatch.predicted_time * 1000);
        matchTimeEl.textContent = matchTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      }

      // Display alliance partners
      const blueAllianceEl = document.getElementById("blue-alliance");
      const redAllianceEl = document.getElementById("red-alliance");
      
      if (blueAllianceEl && redAllianceEl) {
        const blueTeams = nextMatch.alliances.blue.team_keys;
        const redTeams = nextMatch.alliances.red.team_keys;
        
        if (blueTeams.includes(window.FRC_TEAM_KEY)) {
          blueAllianceEl.textContent = "Our Alliance";
          blueAllianceEl.classList.add("font-bold");
          redAllianceEl.textContent = "Opponent Alliance";
        } else if (redTeams.includes(window.FRC_TEAM_KEY)) {
          redAllianceEl.textContent = "Our Alliance";
          redAllianceEl.classList.add("font-bold");
          blueAllianceEl.textContent = "Opponent Alliance";
        } else {
          blueAllianceEl.textContent = "Blue Alliance";
          redAllianceEl.textContent = "Red Alliance";
        }
      }
    } else {
      // No upcoming matches
      setErrorState("match-number", "No scheduled matches");
      setErrorState("match-time", "--:--");
      setErrorState("blue-alliance", "TBD");
      setErrorState("red-alliance", "TBD");
    }
  } catch (error) {
    console.error("Error fetching next match:", error);
    setErrorState("match-number", "Match data unavailable");
    setErrorState("match-time", "--:--");
    setErrorState("blue-alliance", "TBD");
    setErrorState("red-alliance", "TBD");
  }
}

// Add countdown functionality
function updateCountdown(startDate) {
  const now = new Date().getTime();
  const eventStart = new Date(startDate).getTime();
  const timeLeft = eventStart - now;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  // Update UI with countdown
  const rankingNumberEl = document.getElementById("ranking-number");
  const totalTeamsEl = document.getElementById("total-teams");
  const winsEl = document.getElementById("wins");
  const lossesEl = document.getElementById("losses");
  
  if (rankingNumberEl) rankingNumberEl.textContent = days;
  if (totalTeamsEl) totalTeamsEl.textContent = "Days until event";
  if (winsEl) winsEl.textContent = hours;
  if (lossesEl) lossesEl.textContent = minutes;

  // Update labels
  const winsLabelEl = document.querySelector('[for="wins"]');
  const lossesLabelEl = document.querySelector('[for="losses"]');
  
  if (winsLabelEl) winsLabelEl.textContent = "Hours";
  if (lossesLabelEl) lossesLabelEl.textContent = "Minutes";

  // Update next match section
  const matchNumberEl = document.getElementById("match-number");
  const matchTimeEl = document.getElementById("match-time");
  const blueAllianceEl = document.getElementById("blue-alliance");
  const redAllianceEl = document.getElementById("red-alliance");
  
  if (matchNumberEl) matchNumberEl.textContent = "Event Starting Soon";
  if (matchTimeEl) {
    matchTimeEl.textContent = new Date(
      startDate
    ).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  if (blueAllianceEl) blueAllianceEl.textContent = "At";
  if (redAllianceEl) {
    redAllianceEl.textContent = new Date(
      startDate
    ).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// New function for event countdown - Updated to add 37-hour offset
function updateEventCountdown(startDate) {
  const now = new Date().getTime();
  // Add the 37-hour offset to the TBA start date to get the actual start time
  const eventStart = new Date(startDate).getTime() + OFFSET_MS;
  let timeLeft = eventStart - now;
  if (timeLeft < 0) timeLeft = 0;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const countdownEl = document.getElementById("countdown-timer");
  if (countdownEl) {
    countdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}

// New function to update event links with dynamic event key
function updateEventLinks(eventKey) {
  if (!eventKey) return;
  
  // Get all links that should be updated with the dynamic event
  const eventLinks = document.querySelectorAll('.event-link, [data-card] a');
  
  // Update each link with the correct event key
  eventLinks.forEach(link => {
    if (link.href && link.href.includes('event.html')) {
      link.href = `event.html?event=${eventKey}`;
    }
  });
  
  console.log(`Updated event links to point to: ${eventKey}`);
}

// Initialize and update all data with loading states
async function initializeEventData() {
  setLoadingState(true);
  console.log("Initializing event data...");

  try {
    // Use calculated next event instead of a hardcoded one
    console.log("Fetching next event with team key:", window.FRC_TEAM_KEY);
    const currentEvent = await getNextEvent();
    console.log("Next event data:", currentEvent);
    
    if (currentEvent) {
      const currentDate = new Date().getTime();
      const eventStart = new Date(currentEvent.start_date).getTime();
      const eventEnd = new Date(currentEvent.end_date).getTime() + OFFSET_MS;
      
      // Add offset to event start date for comparison
      const actualEventStart = eventStart + OFFSET_MS;

      // Update the event links to point to the next event
      updateEventLinks(currentEvent.key);

      // Check against actual start time (with offset) for determining if the event has started
      if (currentDate >= actualEventStart && currentDate <= eventEnd) {
        // We're currently at an event - show live data
        const eventKey = currentEvent.key;
        document.getElementById("countdown-section").classList.add("hidden");
        document.getElementById("live-updates").classList.remove("hidden");
        updateRankings(eventKey);
        updateRecord(eventKey);
        updateNextMatch(eventKey);
      } else if (currentDate < actualEventStart) {
        // We're before the actual start time - show countdown
        document.getElementById("countdown-section").classList.remove("hidden");
        document.getElementById("live-updates").classList.add("hidden");
        // Pass the original TBA date - the function will add the offset
        updateEventCountdown(currentEvent.start_date);
        setInterval(() => updateEventCountdown(currentEvent.start_date), 1000);
      }
    } else {
      console.error("No upcoming events found");
      setErrorState("ranking-number", "No upcoming event");
      setErrorState("total-teams", "Check back later");
      
      // Use a hard-coded date for Lake City event as fallback
      const fallbackDate = "2025-04-03";
      const fallbackEvent = "2025milac";
      console.log("Using fallback date:", fallbackDate);
      
      // Update links to fallback event
      updateEventLinks(fallbackEvent);
      
      document.getElementById("countdown-section").classList.remove("hidden");
      document.getElementById("live-updates").classList.add("hidden");
      updateEventCountdown(fallbackDate);
      setInterval(() => updateEventCountdown(fallbackDate), 1000);
    }
  } catch (error) {
    console.error("Error initializing data:", error);
    setErrorState("ranking-number", "Error loading data");
    
    // Use a hard-coded date for Lake City event as fallback
    const fallbackDate = "2025-04-03";
    const fallbackEvent = "2025milac";
    console.log("Using fallback date due to error:", fallbackDate);
    
    // Update links to fallback event
    updateEventLinks(fallbackEvent);
    
    document.getElementById("countdown-section").classList.remove("hidden");
    document.getElementById("live-updates").classList.add("hidden");
    updateEventCountdown(fallbackDate);
    setInterval(() => updateEventCountdown(fallbackDate), 1000);
  }
}

// Start updates when document is loaded
document.addEventListener("DOMContentLoaded", initializeEventData);

// Functions for Lake City Regional page
async function loadEventRankings(eventCode) {
  try {
    const response = await fetch(`${window.TBA_BASE_URL}/event/${eventCode}/rankings`, {
      headers: { "X-TBA-Auth-Key": window.TBA_AUTH_KEY }
    });
    const data = await response.json();
    updateRankingsTable(data.rankings);
  } catch (error) {
    console.error(`Error loading rankings for ${eventCode}:`, error);
    document.querySelector("#rankings-table tbody").innerHTML = 
      '<tr><td colspan="4" class="p-4 text-center">No Rankings Available</td></tr>';
  }
}

async function loadEventSchedule(eventCode) {
  try {
    const response = await fetch(`${window.TBA_BASE_URL}/event/${eventCode}/matches`, {
      headers: { "X-TBA-Auth-Key": window.TBA_AUTH_KEY }
    });
    const matches = await response.json();
    updateScheduleTable(matches);
  } catch (error) {
    console.error(`Error loading schedule for ${eventCode}:`, error);
    document.querySelector("#schedule-table tbody").innerHTML = 
      '<tr><td colspan="5" class="p-4 text-center text-red-400">Error loading schedule</td></tr>';
  }
}

function highlightTeam(text, teamNumber = '7790') {
  const teams = text.split(', ');
  return teams.map(team => {
    const isTeam7790 = team === teamNumber;
    return `<a href="team.html?team=${team}" 
              class="transition-colors ${isTeam7790 ? 'text-baywatch-orange hover:text-white' : 'hover:text-baywatch-orange'}">${team}</a>`;
  }).join(', ');
}