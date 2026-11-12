import { defineParams } from '@sveltejs/kit/params';
import { LOGIN } from '#lib/names.ts';
import { isRepoWidget, isWidget } from '#lib/widgets.ts';

export const params = defineParams({
  login: (param) => (LOGIN.test(param) ? param : undefined),
  widget: (param) => (isWidget(param) ? param : undefined),
  repoWidget: (param) => (isRepoWidget(param) ? param : undefined)
});
