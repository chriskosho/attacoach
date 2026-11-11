// Softball wording for shared drills, used only where a baseball word or piece of equipment would be
// wrong for a softball team. Any of name, equipment, setup, steps, points, easier and harder can be
// given; the rest of the drill stays as written. Drills for one sport only are tagged in drillTags.js.

export const SOFTBALL_TEXT = {
  'coach-says': {
    steps: [
      'Play Simon Says with softball positions: "Coach says ready position", "Coach says alligator", "Coach says run to first".',
      'Mix in moves without "Coach says" to keep them listening.',
      'Players who get caught do five jumping jacks and rejoin. Nobody sits out.',
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
}
