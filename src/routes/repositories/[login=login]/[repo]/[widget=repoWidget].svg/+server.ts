import { widget } from '#lib/server/widgets/index.ts';

export const GET = ({ params, request }) =>
  widget(request, params.widget, params.login, params.repo);
