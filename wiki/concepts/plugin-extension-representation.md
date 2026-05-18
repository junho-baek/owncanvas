# 플러그인 확장 표현 | Plugin Extension Representation

## 요약

OwnCanvas 플러그인은 `app/features/plugins/model/plugin-representation.ts`의
`PluginManifest`를 공통 표현으로 사용한다. 플러그인 타입별 차이는 공통
필드를 복제한 schema가 아니라 `type`, `capabilities`, `inputPorts`,
`outputPorts`, `configuration.fields`, `permissions`, 필요한 최소한의
type-specific detail 조합으로 표현한다.

상세 개발 문서는 [Plugin Representation](../../app/features/plugins/model/README.md)에 둔다.

## 핵심 원칙

- identity, lifecycle, origin, metadata, permissions, capabilities,
  configuration은 모든 plugin type이 공유하는 필드이며 타입별로 다시
  정의하지 않는다.
- `provider`, `commission`, `agent`, `dashboard`, `direct-message`,
  `landing`, `tracking`, `custom`은 Campaign 안에서 맡는 역할을 구분하는
  category다.
- 실제 확장은 capability kind, 명시적 input/output port, concurrency,
  provider-specific 또는 commission-specific configuration field로 한다.
- default configuration metadata는 manifest의 `configuration.fields`에서
  파생하며, non-secret default value와 secret reference를 분리해 사람과
  agent installer가 같은 schema를 안전하게 사용할 수 있게 한다.
- `provider`는 canvas와 installer가 실행 전 알아야 하는 media type,
  execution mode, built-in/external 구분, advanced 여부만 `provider`
  detail object로 추가한다.
- built-in provider와 external provider는 같은 manifest를 사용하고,
  provenance만 `origin.kind`와 `origin.packageName`으로 구분한다.
- conversion KPI와 attribution은 `tracking` capability와 Campaign tracking
  config가 기준이며, 다른 플러그인은 필요한 identifier를 port로 주고받는다.

## 타입별 확장 경계

- `provider`: provider detail object, text/image/video/voice generation
  capability, 병렬 bulk generation 설정을 제공한다.
- `commission`: product offer, affiliate/referral URL, payout rule을
  `commission.offer` capability로 제공하고, commission model, offer source,
  payout currency, attribution requirement를 `commission` detail object로
  제공한다. 네트워크, 오퍼 소스, payout, attribution window, approval 설정은
  commission-specific configuration field로 분리한다.
- `agent`: `AgentPluginManifest`의 `agent` detail에 autonomy, 지원
  canvas action, safety mode, human approval 요구 여부를 두고, 사람이 하는
  canvas action과 같은 action을 `agent.action` capability로 제공한다. 실행
  지침, model, action policy, approval policy, memory는 typed
  configuration field로 둔다.
- `dashboard`: `DashboardPluginManifest`의 `dashboard` detail에 report type,
  visualization, realtime/export 지원 여부를 두고, event/json 입력을 report
  json으로 바꾸는 `dashboard.report` capability를 제공한다. metric,
  attribution window, filter, visualization, export 설정은 typed
  configuration field로 둔다.
- `direct-message`: comment, keyword, event를 DM delivery나 tracked URL로
  바꾸는 `channel.dm` capability를 제공한다. Instagram comment trigger는
  `INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA`로 monitored account,
  optional media scope, matched post reference, post selection/filter,
  condition matcher, legacy keyword matcher, attribution template 설정을
  명시하고, `INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA`와
  `owncanvas.instagram-comment-trigger-event.v1` payload로 campaign id,
  account/media/comment id, commenter, text, timestamp, attribution field를
  명시한다. Instagram DM action configuration은 `responseMappings`로
  comment matcher id를 DM template/text와 tracked landing URL에 연결해
  여러 comment trigger가 서로 다른 DM 응답을 선택할 수 있게 한다. DM Gate
  v1도 별도 Campaign-only schema가 아니라 같은
  `INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA`를 canonical source로 사용한다.
  `message.text`는 follow prompt, `landingUrl` 또는 `resourceUrl`은 gated
  destination, `followGate`는 선택적 soft follow gate다. `followGate.enabled`
  가 true이면 `checkQuickReply`, `successMessage`, `notFollowingMessage`,
  `quickReplies`, fixture 전용 `simulatedFollowStatus`가 필요하고,
  `checkQuickReply.payload`가 `FOLLOW_CHECK` branch를 소유한다. plugin detail의
  `triggerConfigurationSchemas`, `triggerEventSchemas`,
  `actionConfigurationSchemas`로 이 계약을 광고할 수 있다.
- `landing`: creative asset과 offer를 landing URL로 publish하는
  `landing.page` capability를 제공한다. `LANDING_PAGE_HANDOFF_EVENT_SCHEMA`와
  `owncanvas.landing-page-handoff-event.v1` payload로 channel/agent
  action에서 landing page로 넘어가는 tracked URL, checkout URL, offer,
  visitor, attribution context를 명시할 수 있다. DM delivery에서 landing
  capability로 넘어가는 referral data는 `LANDING_DM_REFERRAL_CONTEXT_SCHEMA`
  (`owncanvas.landing-dm-referral-context.v1`)로 등록하며, landing plugin은
  `dmReferralContextSchemas`와 `dmReferralContext` JSON input port를 함께
  선언해야 한다.
- `tracking`: funnel event와 final conversion을 수집하는 `track.event`와
  `track.conversion` capability를 제공한다.
- `custom`: 아직 category로 승격되지 않은 실험적 integration을 공통
  manifest 안에 유지한다.

## 관련 파일

- [plugin-representation.ts](../../app/features/plugins/model/plugin-representation.ts)
- [Plugin Representation README](../../app/features/plugins/model/README.md)
