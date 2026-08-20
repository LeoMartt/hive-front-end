export interface AgingThresholds {
  alerta: number;
  risco: number;
}

export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
}
