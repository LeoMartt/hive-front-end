# Alteracao das regras de evidencia

Decisao de 20/10/2026: permitir mudancas de configuracao com confirmacao, sem invalidar registros anteriores.

- Salvar regras em Papeis & Config consulta o impacto e pede Confirmar alteracao antes de persistir. Voltar nao salva.
- A confirmacao mostra os valores anteriores/novos e a contagem atual de atividades pendentes quando a regra de atividade ou o tamanho muda. Concluidas e canceladas nao entram.
- Atividades pendentes seguem a regra vigente na conclusao; novas issues impeditivas seguem a regra vigente na abertura.
- Atividades ja concluidas e issues ja abertas nao precisam receber anexos retroativamente. Nenhum arquivo e removido.
- O anexo da solucao continua opcional. A configuracao da issue afeta apenas a abertura de issues impeditivas.
- O limite de tamanho vale para novos envios; arquivos antigos nao sao invalidados. Audio/video permanecem proibidos.
- O backend registra autor, data e valores anteriores/novos em EvidenceRuleChange, consultavel pelo Django Admin. Requer a migration projects.0005_evidence_rule_change.
- A confirmacao e de interface, nao substitui as permissoes do backend. O impacto e consultado via GET /projects/<id>/evidence-impact/; falha na consulta impede o salvamento pela tela.

Especificacao completa, limites do historico e decisoes futuras: hive-back/docs/regras_alteracao_evidencias.md no repositorio backend.
