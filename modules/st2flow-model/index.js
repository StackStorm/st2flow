import OrquestaModel from './model-orquesta';
import MistralModel from './model-mistral';

export { layout } from './layout';

const models = {};

[
  OrquestaModel,
  MistralModel,
].forEach(M => {
  M.runner_types.forEach(type => {
    models[type] = M;
  });
});

export { models, OrquestaModel, MistralModel };
