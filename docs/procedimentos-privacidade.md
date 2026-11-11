# Procedimentos de privacidade do OMV

Responsável pelo serviço: João Marcos Nogueira Maia Cavalcanti. Canal informado: joaomarcosnog10@gmail.com.

## Solicitações de titulares

1. Receba pedidos pelo e-mail público, inclusive de pessoas sem acesso à conta. Registre protocolo, recebimento, tipo de pedido, prazo, ações e conclusão em armazenamento privado com acesso restrito.
2. Confirme a identidade de forma proporcional. Não peça senha nem cópia integral de documentos como procedimento padrão. Não envie dados a outro endereço sem verificar a legitimidade da solicitação.
3. Oriente sobre `/app/privacidade`: acesso ao cadastro, correção de nome, exportação JSON e exclusão de conta. Para correção de e-mail, verifique os endereços envolvidos e evite troca que permita tomada de conta.
4. Atenda confirmação/acesso simplificados imediatamente e acesso completo em até 15 dias, observadas as regras aplicáveis. Outros direitos têm tratamento conforme a LGPD e a regulamentação; não confundir o prazo de acesso com prazo universal.
5. Se não puder atender, informe o fundamento e registre as providências. Encaminhe aos operadores as medidas cabíveis e documente a conclusão.

## Eliminação, retenção e restauração

- `DELETE /api/auth/me` exige sessão, senha atual e confirmação `EXCLUIR`; a remoção da conta aciona as quatro chaves estrangeiras com `ON DELETE CASCADE`.
- Nenhuma exclusão real foi executada na implementação. Testes usam dependências simuladas.
- Confirme retenção e exclusão de cópias com Neon/Vercel. Registre intervalos de backup, expiração, logs, destinatários e fundamento de eventual conservação legal antes de informar prazos definitivos.
- Mantenha controle privado de solicitações de eliminação pelo período necessário e com dados mínimos para evitar reativar contas/dados por restauração. Não restaure backup para produção sem reaplicar eliminações e revisar acessos.

## Fornecedores e transferências

Confira a região em Vercel → projeto → Settings → Functions → Function Regions e nas configurações do projeto Neon. Em 2026-11-11 o controlador informou Vercel `iad1` (Washington, D.C., EUA) e Neon AWS `sa-east-1` (São Paulo, Brasil), consistente com o endereço local do banco. Preserve evidências privadas dos painéis e reavalie após mudanças.

Inventarie também backups, suporte e suboperadores. Verifique DPAs e mecanismo jurídico de transferência quando necessário, incluindo requisitos da Resolução ANPD 19/2024. Atualize a política com informações verificadas; não trate aceite genérico da política como autorização para qualquer transferência.

## Incidentes

1. Contenha o incidente, revogue credenciais comprometidas e preserve evidências com acesso restrito; não copie senhas, tokens ou dados financeiros para issues públicas.
2. Registre ciência, escopo, sistemas, titulares afetados, medidas de contenção e avaliação de risco ou dano relevante.
3. Avalie a comunicação à ANPD e aos titulares conforme art. 48 e Resolução 15/2024. O prazo geral é três dias úteis, ressalvadas hipóteses e regras específicas aplicáveis. Não presuma dispensa ou prazo diferenciado sem validar o enquadramento.
4. Mantenha registro dos incidentes pelo prazo regulamentar aplicável (a Resolução 15/2024 prevê ao menos cinco anos), com minimização e controle de acesso.

## Mudanças no site

Antes de adicionar analytics, publicidade, gravação de sessão ou outros tratamentos opcionais, avalie a base legal e a necessidade de consentimento prévio, granular e revogável. Se necessário, implementar aceitar/rejeitar com igual destaque e bloqueio efetivo antes da escolha. Atualize a política e o inventário.

Revisite periodicamente o relatório `docs/adequacao-lgpd.md`. Ele registra pendências e não atesta conformidade integral.
