module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.APP_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip all console.* calls from production builds
      ...(isProduction ? [['transform-remove-console', { exclude: [] }]] : []),
    ],
  };
};
