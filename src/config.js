const CONFIG = {
  foreignKey: "documento",
  masterResultsDirName: "Resultados",
  dailyResultsDirName: "Resultados_",
  sheets: {
    demografica: {
      name: "sociodemografica",
      columns: {
        marcatemporal: 0,
        nombre: 7,
        edad: 9,
        documento: 8
      }
    },
    fisica: {
      name: "fisica",
      columns: {
        marcatemporal: 0,
        umbral: 1,
        documento: 2
      }
    }
  }
};




