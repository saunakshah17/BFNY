export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) {
      if (!env.GAME) return Response.json({error:'GAME service binding is missing. See SETUP.md.'},{status:503});
      return env.GAME.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
