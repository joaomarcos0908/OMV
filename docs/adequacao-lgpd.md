# Relatório técnico de adequação à LGPD

- **Sistema:** OMV — https://omv-lake.vercel.app/
- **Data:** 2026-11-11
- **Controlador informado:** João Marcos Nogueira Maia Cavalcanti (pessoa física).
- **Canal público informado:** joaomarcosnog10@gmail.com.
- **Escopo:** código local e navegador com dados simulados. O acesso ao site publicado pela ferramenta de consulta não foi possível. Não houve consulta ou alteração de dados reais, nem validação dos contratos dos fornecedores.
- **Situação:** em adequação. Não constitui certificação, aprovação da ANPD ou confirmação de conformidade integral.

## Resumo

Foram implementados política pública, links de privacidade, aviso no cadastro, correção de nome, exportação JSON, exclusão de conta autenticada com senha, redução de dependências externas e proteção contra cache de respostas pessoais. Ainda é necessário verificar infraestrutura, contratos, retenção e processos operacionais antes de encerrar a adequação.

## Avaliação por categoria

A unidade de pontuação abaixo é cada uma das seis categorias, não todos os requisitos legais. Conforme = 1; parcial = 0,5; não conforme = 0. O resultado técnico é **66,7%**: `(2 + 4 × 0,5) / 6 × 100`. Esta pontuação indica apenas o estado da amostra inspecionada e não mede risco jurídico ou probabilidade de sanção.

| Categoria | Estado | Evidências e pendências |
| --- | --- | --- |
| Política e transparência | Parcial | `/privacidade`, identificação de pessoa física, contato, dados, finalidades, direitos e limitações. Faltam confirmar retenção, transferências e eventual enquadramento/nomeação de encarregado. CNPJ não se aplica ao controlador informado. |
| Cookies e armazenamento | Conforme no código inspecionado | Apenas sessão/perfil e cache de taxas públicas. Não foram identificados analytics, publicidade ou pixels. Não foi criado banner de consentimento sem finalidade opcional real. Verificar serviços habilitados no painel de produção. |
| Minimização e segurança | Parcial | Exportação sem credenciais; logs de erro reduzidos a códigos; mensagens sem detalhes internos; respostas privadas sem cache. Faltam comprovar retenção de logs, revisão de acesso e configuração de transporte/fornecedores. |
| Transferências internacionais | Parcial | Fornecedores e consultas externas inventariados. Controlador confirmou Vercel `iad1` (Washington, D.C., EUA) e Neon AWS `sa-east-1` (São Paulo, Brasil). Há processamento nos EUA. Backups, suporte, suboperadores e mecanismos contratuais ainda não confirmados. |
| Direitos do titular | Parcial | Canal público, correção do nome, download e exclusão da base ativa. Atendimento por e-mail deve ter protocolo, verificação proporcional de identidade, acompanhamento e propagação das eliminações cabíveis. |
| Scripts e terceiros | Conforme no código inspecionado | Chart.js 4.4.0 servido localmente com licença; Google Fonts e jsDelivr removidos das páginas; CSP restringe scripts à própria origem. Reavaliar após mudanças e conferir o site publicado. |

## Inventário de tratamento

| Dados | Finalidade | Local / destinatários | Base indicada para revisão |
| --- | --- | --- | --- |
| Nome, e-mail, hash de senha, datas e identificador | Cadastro e autenticação | Banco da aplicação; infraestrutura Vercel/Neon | Art. 7º, V |
| Receitas, despesas, investimentos e metas | Organização financeira solicitada | Banco e navegador autenticado | Art. 7º, V |
| Token e perfil em armazenamento local | Manter sessão, até sete dias de validade do token | Dispositivo do usuário | Art. 7º, V |
| IP, metadados de acesso e tentativas de login | Segurança e entrega do serviço | Hospedagem e memória temporária de rate limit | Art. 7º, IX; avaliação de balanceamento pendente |
| Mensagens sobre privacidade | Atendimento de direitos | E-mail público do controlador e provedor de e-mail | Art. 7º, II |
| Tickers e taxas públicas | Cotações e cálculos | Yahoo Finance, CoinGecko e Banco Central via servidor; consultas de taxas ao BCB pelo navegador | Revisar necessidade e transparência; conexão direta revela IP ao BCB |

Não há finalidade de coleta de dados sensíveis. Campos livres podem conter esses dados se o usuário os inserir: a política orienta a não fazê-lo e pedidos devem ser avaliados individualmente. Não se deve presumir que todo dado financeiro é dado sensível na definição do art. 5º, II.

## Ações operacionais pendentes

1. **Alta / médio esforço:** registrar evidências das regiões informadas (Vercel/EUA e Neon/Brasil), confirmar países de backups e suboperadores, contratos de tratamento (DPAs) e mecanismo de transferência aplicável. Não basta selecionar uma região brasileira para afastar qualquer transferência.
2. **Alta / médio:** confirmar e configurar retenção de logs e backups nos fornecedores; registrar prazos reais e atualizar a política. Nunca prometer eliminação instantânea de todas as cópias.
3. **Alta / baixo:** verificar o e-mail público periodicamente e registrar protocolos, datas, identidade verificada e desfecho de solicitações em ambiente privado. Não colocar esses registros no Git.
4. **Alta / médio:** definir responsável pelo atendimento e avaliar a necessidade de encarregado e eventual aplicação de regras para agentes de pequeno porte. Ser pessoa física não estabelece automaticamente dispensa.
5. **Alta / médio:** formalizar resposta a incidentes e avaliação de legítimo interesse para segurança. Validar os prazos e hipóteses aplicáveis com assessoria jurídica.
6. **Média / baixo:** publicar o código e verificar rotas, cabeçalhos, ausência de recursos opcionais e comportamento em produção. Nenhum push ou deploy foi realizado nesta etapa.
7. **Média / médio:** revisar proteção de tokens no navegador, certificado TLS do banco, controles de acesso e limites de requisições distribuídos. O limitador atual funciona por instância e não é proteção global garantida.

Não foi gerado `lgpd.md` declaratório: faltam respostas verificáveis sobre encarregado, transferências e retenção. A skill `lgpd-md` exige resolver a entrevista antes de gerar a declaração; inventar esses campos produziria uma declaração enganosa. O formato não é uma exigência legal da LGPD.

## Fontes oficiais consultadas

- [Direitos e prazo de acesso — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares): arts. 18 e 19.
- [Guia sobre cookies — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais): arts. 6º, 7º e 8º.
- [Transferências internacionais — ANPD](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados): arts. 33 a 36 e Resolução 19/2024.
- [Comunicação de incidentes — ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis): art. 48 e Resolução 15/2024.

Este relatório é uma ferramenta de apoio técnico — não substitui parecer jurídico nem advogado.
