const CONFIG = {
  foreignKey: "documento",
  masterResultsDirName: "Resultados",
  dailyResultsDirName: "Resultados_",
  sheets: {
    demografica: {
      name: "demografica",
      columns: {
        marcaTemporal: 0,
        Nombre: 1,
        Edad: 2,
        documento: 3
      }
    },
    fisica: {
      name: "fisica",
      columns: {
        marcaTemporal: 0,
        umbral: 1,
        documento: 2
      }
    }
  }
};




