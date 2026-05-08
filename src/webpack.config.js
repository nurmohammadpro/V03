const path = require('path');
module.exports = {
  entry: path.resolve(__dirname, 'main.js'),
  output: {
    filename: 'main.min.js',
    // Note: Since this file is in V03/src, the output path should be relative to V03/src
    // If the final public folder is adjacent to src, we need to adjust 'path'
    // Based on previous instructions, let's assume the output is within a public/assets folder structure relative to V03/src
    path: path.join(__dirname, '..', 'public'),
  },
  optimization: {
    minimize: true, // Enable minimization for production
  },
};
