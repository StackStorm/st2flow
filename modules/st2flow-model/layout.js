// @flow

import type { ModelInterface } from './interfaces';

export function layout(model: ModelInterface) {
  model.tasks.forEach(task => {
    const { name } = task;
    model.updateTask({ name }, { coords: { x: -1, y: -1 }});
  });
}
