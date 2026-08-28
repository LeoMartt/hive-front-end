// Ponto de entrada da camada api/: importar daqui garante que os interceptors
// foram registrados antes do primeiro request.
import "./interceptors";
export { httpClient } from "./httpClient";
