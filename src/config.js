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
        documento: 8,
        genero: 10,
        colegio: 21,
        grado: 22,
        acudiente: 1,
        telefono: 2,
        investigacion: 18
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




