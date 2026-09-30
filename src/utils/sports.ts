/**
 * Shared sport + position/event lists.
 *
 * Used by the profile editor and the onboarding sport picker.
 * Sports without a meaningful position (e.g. Golf, Cross Country)
 * have an empty list; UI should hide the position section for them.
 */

export const SPORTS = [
  "Soccer",
  "Basketball",
  "Cross Country",
  "Diving",
  "Field Hockey",
  "Football",
  "Golf",
  "Ice Hockey",
  "Lacrosse",
  "Rowing",
  "Rugby",
  "Softball",
  "Squash",
  "Swimming",
  "Tennis",
  "Track & Field",
  "Volleyball",
  "Water Polo",
  "Wrestling",
  "Other",
];

export const POSITIONS: Record<string, string[]> = {
  Soccer: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Basketball: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
  "Cross Country": [],
  Diving: ["1-Meter Springboard", "3-Meter Springboard", "Platform"],
  "Field Hockey": ["Forward", "Midfield", "Defense", "Goalkeeper"],
  Football: [
    "Quarterback",
    "Running Back",
    "Wide Receiver",
    "Tight End",
    "Offensive Line",
    "Defensive Line",
    "Linebacker",
    "Cornerback",
    "Safety",
    "Kicker/Punter",
  ],
  Golf: [],
  "Ice Hockey": ["Center", "Winger", "Defenseman", "Goalie"],
  Lacrosse: ["Attack", "Midfield", "Defense", "Goalie", "Faceoff Specialist"],
  Rowing: ["Sweep", "Sculling", "Coxswain"],
  Rugby: [
    "Prop",
    "Hooker",
    "Lock",
    "Flanker",
    "Number 8",
    "Scrum-Half",
    "Fly-Half",
    "Center",
    "Wing",
    "Fullback",
  ],
  Softball: ["Pitcher", "Catcher", "Infield", "Outfield"],
  Squash: [],
  Swimming: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"],
  Tennis: ["Singles", "Doubles"],
  "Track & Field": ["Sprints", "Hurdles", "Middle Distance", "Distance", "Jumps", "Throws"],
  Volleyball: ["Setter", "Outside Hitter", "Opposite", "Middle Blocker", "Libero", "Defensive Specialist"],
  "Water Polo": ["Goalkeeper", "Center Forward", "Center Back", "Driver", "Utility"],
  Wrestling: ["Lightweight", "Middleweight", "Heavyweight"],
  Other: [],
};
