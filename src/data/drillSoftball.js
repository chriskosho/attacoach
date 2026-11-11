// Softball wording for shared drills, used only where a baseball word or piece of equipment would be
// wrong for a softball team. Any of name, equipment, setup, steps, points, easier and harder can be
// given; the rest of the drill stays as written. Drills for one sport only are tagged in drillTags.js.

export const SOFTBALL_TEXT = {
  'coach-says': {
    steps: [
      'Play Simon Says with softball positions: "Coach says ready position", "Coach says alligator", "Coach says run to first".',
      'Mix in moves without "Coach says" to keep them listening.',
      'Nobody is ever out. If someone gets caught, the coach gets a point, and the team tries to win the next call.',
    ],
  },
  alligator: { equipment: ['Soft training balls or softballs', 'Gloves'] },
  blocking: { equipment: ['Catcher gear', 'Soft training balls or softballs'] },
  'catcher-receiving': { equipment: ['Catcher gear', 'Soft training balls or softballs'] },
  'bullpen-targets': { setup: 'Pitcher in the circle or on flat ground at league distance, catcher with full gear.' },
  'sprint-starts': { setup: 'Players in a line on a cone, in an athletic stance, facing sideways.' },
  'shadow-situations': {
    points: ['Great for rainy days and gyms. Softball IQ needs no ball.', 'Ask players to explain where they went and why.'],
  },
  // Softball's strike zone is taller than baseball's, and it is worded a little differently by league.
  'ball-or-strike': {
    points: ['Track the ball all the way to the glove.', 'Know your zone: about the armpits to the top of the knees, across the plate. Check how your league words it.'],
  },
  // A softball is bigger; young hands often can't grip it with two fingers.
  'throwing-progression': {
    points: [
      'Four-seam grip: fingers across the seams, the ball on the finger pads. Small hands can use three fingers.',
      'Point the glove at the target and step toward it.',
      'Catch with two hands, then move feet to throw.',
    ],
  },
  // Many softball fields use a double first base: the runner uses the colored half, the fielder the white half.
  'run-through-first': {
    points: ['Eyes on the bag, not the ball.', 'Run through it like a finish line.', 'If your field has a double first base, run through the colored half, in foul territory.'],
  },
  'first-base-footwork': {
    points: ['Find the bag first, then the ball.', "Don't stretch until you see where the throw is going.", 'On a double first base, the fielder uses the white half and leaves the colored half to the runner.'],
  },
}
