module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      externals: ['formidable', 'superagent', 'parse5', 'mssql', 'axios'],
      builderOptions: {
        productName: "Projeto Usinagem",
        files: [
          "**/*"
        ],
        extraFiles: [
          {
            "from": "src/injecoes",
            "to": "injecoes",
            "filter": ["**/*"]
          }
        ]
      },
      chainWebpackMainProcess: config => {
        config.module
          .rule('babel')
          .use('babel')
          .loader('babel-loader')
          .options({
            presets: [['@babel/preset-env', { modules: false }]],
            plugins: ['@babel/plugin-proposal-class-properties']
          })
      },
    }
  }
}