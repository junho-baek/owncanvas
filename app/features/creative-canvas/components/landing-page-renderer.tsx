import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, FormEvent, MouseEvent, SyntheticEvent } from "react";

import {
  captureCampaignSurfaceTrackedClick,
  createCampaignSurfaceModuleExposureInput,
  createCampaignSurfacePlaybackControlEngagementInput,
  createCampaignSurfacePlaybackEngagementInput,
  createCampaignSurfaceScrollEngagementInput,
  createCampaignSurfaceTrackingClient,
  type CampaignSurfaceTrackingClient,
} from "~/features/creative-canvas/client/campaign-surface-tracking";
import {
  createCampaignLandingPageRenderModel,
  createEmbeddedShortFormLandingPageTemplateModule,
  getCampaignLandingPageBehaviorConfiguration,
  getCampaignLandingPageConversionElements,
  getCampaignLandingPageNavigationConfiguration,
  type CampaignAsset,
  type CampaignDraft,
  type CampaignLandingPageConversionElementConfiguration,
  type CampaignLandingPageConversionElementPlacement,
  type CampaignLandingPageElementTiming,
  type CampaignLandingPageNavigationPlacement,
  type CampaignLandingPageRenderModel,
  type CampaignLandingPageRenderedModule,
  type CampaignLandingPageTemplateSchema,
  type CampaignLandingPagePlaybackInterruptionBehavior,
} from "~/features/creative-canvas/model/creative-canvas";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createDefaultCampaignLandingPageTemplate(
  campaign: CampaignDraft,
): CampaignLandingPageTemplateSchema | null {
  const sourceAsset = campaign.assets.find(
    (asset) => asset.mediaType === "video" && asset.uri.trim() !== "",
  );
  const authoredConversionElements =
    getCampaignLandingPageConversionElements(campaign);
  const defaultConversionElement: CampaignLandingPageConversionElementConfiguration =
    {
      id: "conversion_primary_offer",
      label: campaign.productOffer.offer.callToAction.trim() || "Open offer",
      conversionEventName:
        campaign.channels[0]?.tracking.conversionEvent.trim() || "purchase",
      destinationUrl: campaign.productOffer.offer.destinationUrl,
      visibility: "visible",
      placement: "sticky-bottom",
      timing: "after-playback-start",
      interruptionBehavior: "pause-on-activate",
    };

  if (sourceAsset === undefined) {
    return null;
  }

  return {
    schemaVersion: "owncanvas.landing-page-template.v1",
    id: `landing_template_${campaign.id}`,
    title: campaign.title === "" ? "Campaign landing" : campaign.title,
    pageType: "immersive",
    behavior: getCampaignLandingPageBehaviorConfiguration(campaign),
    navigation: getCampaignLandingPageNavigationConfiguration(campaign),
    conversionElements: isHttpUrl(campaign.productOffer.offer.destinationUrl)
      ? authoredConversionElements.length > 0
        ? authoredConversionElements
        : [defaultConversionElement]
      : [],
    modules: [
      createEmbeddedShortFormLandingPageTemplateModule({
        id: "module_source_short",
        label: sourceAsset.title === "" ? "Source short" : sourceAsset.title,
        provider: {
          providerPluginId: "plugin.landing.owncanvas-native",
          providerKind: "built-in",
          sourcePlatform: "owncanvas",
          sourceType:
            sourceAsset.source === "upload" ? "uploaded-asset" : "generated-asset",
          sourceContentId: sourceAsset.id,
          sourceUrl: sourceAsset.uri,
          sourceAssetId: sourceAsset.id,
          embedMode: "native-player",
        },
        configuration: {
          aspectRatio: getAssetNativeAspectRatio(sourceAsset),
          autoplay: false,
          muted: true,
          loop: true,
          showCaptions: true,
          preserveSourceChrome: true,
        },
      }),
    ],
  };
}

export function getCampaignLandingPageRenderModel(
  campaign: CampaignDraft,
): CampaignLandingPageRenderModel | null {
  const template =
    campaign.campaignSpec.landingPageTemplate ??
    createDefaultCampaignLandingPageTemplate(campaign);

  if (template === null) {
    return null;
  }

  const templateForRender = {
    ...template,
    behavior:
      template.behavior ?? getCampaignLandingPageBehaviorConfiguration(campaign),
  };

  return createCampaignLandingPageRenderModel(templateForRender);
}

export function CampaignLandingPageRenderer({
  campaign,
}: {
  campaign: CampaignDraft;
}) {
  const renderModel = getCampaignLandingPageRenderModel(campaign);
  const trackingClient = useCampaignSurfaceTrackingClient(campaign);
  useCampaignSurfaceScrollEngagement(campaign, trackingClient);
  const chromePolicy = useMemo(
    () =>
      renderModel === null
        ? null
        : createCampaignLandingChromeRenderPolicy(renderModel),
    [renderModel],
  );
  const navigationPolicy = chromePolicy?.navigation;

  if (renderModel === null) {
    return (
      <main className="campaign-landing-empty">
        <p>No short-form landing modules configured.</p>
      </main>
    );
  }

  return (
    <main className="campaign-landing-page">
      <section className="campaign-landing-shell" aria-label={renderModel.title}>
        {renderModel.navigation.visibility === "visible" &&
        navigationPolicy !== undefined ? (
          <nav
            className="campaign-landing-navigation"
            aria-label="Campaign landing navigation"
            data-placement={renderModel.navigation.placement}
            data-timing={renderModel.navigation.timing}
            data-interruption={renderModel.navigation.interruptionBehavior}
            data-render-placement={navigationPolicy.renderPlacement}
            data-render-timing={navigationPolicy.renderTiming}
            data-render-interruption={
              navigationPolicy.renderInterruptionBehavior
            }
            data-consumption-safe={navigationPolicy.consumptionSafe}
          />
        ) : null}
        <div className="campaign-landing-copy">
          <p>OwnCanvas landing</p>
          <h1>{renderModel.title}</h1>
          <span>{campaign.productOffer.offer.callToAction || "Continue"}</span>
        </div>
        <div className="campaign-landing-modules">
          <div className="campaign-landing-playback-row">
            <div className="campaign-landing-playback-stack">
              {renderModel.modules.map((module) => (
                <CampaignLandingPageModuleRenderer
                  key={module.id}
                  campaign={campaign}
                  module={module}
                  trackingClient={trackingClient}
                />
              ))}
            </div>
            <CampaignLandingCommercePanel
              campaign={campaign}
              chromePolicy={chromePolicy}
              trackingClient={trackingClient}
            />
          </div>
        </div>
        <CampaignLandingPageConversionElements
          campaign={campaign}
          chromePolicy={chromePolicy}
          renderModel={renderModel}
          trackingClient={trackingClient}
        />
      </section>
    </main>
  );
}

function CampaignLandingPageConversionElements({
  campaign,
  chromePolicy,
  renderModel,
  trackingClient,
}: {
  campaign: CampaignDraft;
  chromePolicy: CampaignLandingChromeRenderPolicy | null;
  renderModel: CampaignLandingPageRenderModel;
  trackingClient: CampaignSurfaceTrackingClient | null;
}) {
  const visibleElements = renderModel.conversionElements.filter(
    (element) => element.visibility === "visible",
  );

  if (visibleElements.length === 0) {
    return null;
  }

  return (
    <div
      className="campaign-landing-conversion-elements"
      data-consumption-safe={
        chromePolicy?.conversionElements.every(
          (policy) => policy.consumptionSafe === "true",
        ) ?? false
      }
    >
      {visibleElements.map((element) => {
        const policy =
          chromePolicy?.conversionElements.find(
            (conversionPolicy) => conversionPolicy.id === element.id,
          ) ?? createCampaignLandingConversionElementRenderPolicy(element, false);
        const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
          void captureCampaignSurfaceTrackedClick({
            campaign,
            trackingClient,
            event,
          });
        };

        return (
          <a
            key={element.id}
            href={element.destinationUrl}
            onClick={handleClick}
            data-campaign-track-click="true"
            data-tracking-target-type="cta"
            data-tracking-target-id={element.id}
            data-tracking-label={element.label}
            data-tracking-destination="conversion"
            data-tracking-content-type="landing_cta"
            data-tracking-content-id={`${element.id}:content`}
            data-tracking-output-port-id="outputs.click"
            data-placement={element.placement}
            data-timing={element.timing}
            data-interruption={element.interruptionBehavior}
            data-render-placement={policy.renderPlacement}
            data-render-timing={policy.renderTiming}
            data-render-interruption={policy.renderInterruptionBehavior}
            data-consumption-safe={policy.consumptionSafe}
            target={policy.target}
            rel={policy.rel}
          >
            {element.label}
          </a>
        );
      })}
    </div>
  );
}

type CampaignLandingChromeRenderPolicy = {
  navigation: {
    renderPlacement: CampaignLandingPageNavigationPlacement;
    renderTiming: CampaignLandingPageElementTiming;
    renderInterruptionBehavior: CampaignLandingPagePlaybackInterruptionBehavior;
    consumptionSafe: "true" | "false";
  };
  conversionElements: Array<{
    id: string;
    renderPlacement: CampaignLandingPageConversionElementPlacement;
    renderTiming: CampaignLandingPageElementTiming;
    renderInterruptionBehavior: CampaignLandingPagePlaybackInterruptionBehavior;
    consumptionSafe: "true" | "false";
    target?: "_blank";
    rel?: "noopener noreferrer";
  }>;
  commercePanel: {
    target?: "_blank";
    rel?: "noopener noreferrer";
  };
};

export function createCampaignLandingChromeRenderPolicy(
  renderModel: CampaignLandingPageRenderModel,
): CampaignLandingChromeRenderPolicy {
  const preserveActiveConsumption =
    renderModel.behavior.mode === "immersion-preserving" &&
    renderModel.behavior.preserveInlineContext;

  return {
    navigation: createCampaignLandingNavigationRenderPolicy(
      renderModel.navigation.placement,
      renderModel.navigation.timing,
      renderModel.navigation.interruptionBehavior,
      preserveActiveConsumption,
    ),
    conversionElements: renderModel.conversionElements.map((element) =>
      createCampaignLandingConversionElementRenderPolicy(
        element,
        preserveActiveConsumption,
      ),
    ),
    commercePanel: createCampaignLandingCommercePanelRenderPolicy(
      preserveActiveConsumption,
    ),
  };
}

function createCampaignLandingNavigationRenderPolicy(
  placement: CampaignLandingPageNavigationPlacement,
  timing: CampaignLandingPageElementTiming,
  interruptionBehavior: CampaignLandingPagePlaybackInterruptionBehavior,
  preserveActiveConsumption: boolean,
): CampaignLandingChromeRenderPolicy["navigation"] {
  if (!preserveActiveConsumption) {
    return {
      renderPlacement: placement,
      renderTiming: timing,
      renderInterruptionBehavior: interruptionBehavior,
      consumptionSafe: interruptionBehavior === "non-blocking" ? "true" : "false",
    };
  }

  return {
    renderPlacement: placement === "inline" ? "inline" : "inline",
    renderTiming: timing === "manual" ? "manual" : "manual",
    renderInterruptionBehavior: "non-blocking",
    consumptionSafe: "true",
  };
}

function createCampaignLandingConversionElementRenderPolicy(
  element: CampaignLandingPageConversionElementConfiguration,
  preserveActiveConsumption: boolean,
): CampaignLandingChromeRenderPolicy["conversionElements"][number] {
  if (!preserveActiveConsumption) {
    return {
      id: element.id,
      renderPlacement: element.placement,
      renderTiming: element.timing,
      renderInterruptionBehavior: element.interruptionBehavior,
      consumptionSafe:
        element.interruptionBehavior === "non-blocking" ? "true" : "false",
    };
  }

  const renderPlacement =
    element.placement === "sticky-bottom" ? "side-panel" : element.placement;
  const renderTiming =
    element.timing === "after-playback-complete" || element.timing === "manual"
      ? element.timing
      : "after-playback-complete";

  return {
    id: element.id,
    renderPlacement,
    renderTiming,
    renderInterruptionBehavior: "non-blocking",
    consumptionSafe: "true",
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

function createCampaignLandingCommercePanelRenderPolicy(
  preserveActiveConsumption: boolean,
): CampaignLandingChromeRenderPolicy["commercePanel"] {
  if (!preserveActiveConsumption) {
    return {};
  }

  return {
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

function CampaignLandingCommercePanel({
  campaign,
  chromePolicy,
  trackingClient,
}: {
  campaign: CampaignDraft;
  chromePolicy: CampaignLandingChromeRenderPolicy | null;
  trackingClient: CampaignSurfaceTrackingClient | null;
}) {
  const productTitle =
    campaign.productOffer.product.title.trim() || "Campaign offer";
  const offerHeadline =
    campaign.productOffer.offer.headline.trim() || campaign.title || productTitle;
  const offerSummary =
    campaign.productOffer.offer.summary.trim() ||
    campaign.productOffer.product.description.trim() ||
    "Continue from the short-form story without leaving the page context.";
  const priceLabel =
    campaign.productOffer.offer.price.display.trim() ||
    campaign.productOffer.offer.discount.trim() ||
    "Offer details";
  const ctaLabel =
    campaign.productOffer.offer.callToAction.trim() || "Open offer";
  const offerHref = getCampaignOfferHref(campaign);
  const commerceLinkPolicy =
    chromePolicy?.commercePanel ??
    createCampaignLandingCommercePanelRenderPolicy(false);

  const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
    void captureCampaignSurfaceTrackedClick({
      campaign,
      trackingClient,
      event,
    });
  };

  const handleSignupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <aside
      className="campaign-landing-commerce-panel"
      aria-label="Product offer and campaign actions"
    >
      <section className="campaign-landing-product-card" aria-label={productTitle}>
        <p>Featured offer</p>
        <h2>{productTitle}</h2>
        <span>{priceLabel}</span>
      </section>
      <section className="campaign-landing-offer-module" aria-label={offerHeadline}>
        <h3>{offerHeadline}</h3>
        <p>{offerSummary}</p>
        {offerHref === "" ? (
          <span className="campaign-landing-disabled-cta">{ctaLabel}</span>
        ) : (
          <a
            href={offerHref}
            onClick={handleCtaClick}
            data-campaign-track-click="true"
            data-tracking-target-type="cta"
            data-tracking-target-id="commerce-panel:primary-offer"
            data-tracking-label={ctaLabel}
            data-tracking-destination="conversion"
            data-tracking-content-type="landing_cta"
            data-tracking-content-id="commerce-panel:primary-offer:content"
            data-tracking-output-port-id="outputs.click"
            target={commerceLinkPolicy.target}
            rel={commerceLinkPolicy.rel}
          >
            {ctaLabel}
          </a>
        )}
      </section>
      <form
        className="campaign-landing-signup-form"
        aria-label="Campaign signup"
        onSubmit={handleSignupSubmit}
      >
        <label htmlFor="campaign-landing-signup-email">Get the offer link</label>
        <div>
          <input
            id="campaign-landing-signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="email@example.com"
          />
          <button type="submit">Send</button>
        </div>
      </form>
    </aside>
  );
}

function CampaignLandingPageModuleRenderer({
  campaign,
  module,
  trackingClient,
}: {
  campaign: CampaignDraft;
  module: CampaignLandingPageRenderedModule;
  trackingClient: CampaignSurfaceTrackingClient | null;
}) {
  useCampaignSurfaceModuleExposure(campaign, module, trackingClient);
  const playbackInstrumentation = useCampaignShortFormPlaybackInstrumentation({
    campaign,
    module,
    trackingClient,
  });

  if (module.type === "inline-short-form-continuation") {
    const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
      void captureCampaignSurfaceTrackedClick({
        campaign,
        trackingClient,
        event,
      });
    };

    return (
      <section
        className={module.className}
        aria-label={module.label}
        data-exposure-surface="landing"
        data-exposure-placement="continuation"
      >
        {module.segments.map((segment) => (
          <article key={segment.id}>
            <span>{segment.mediaType}</span>
            <h2>{segment.headline}</h2>
          </article>
        ))}
        <a
          href={module.cta.url}
          onClick={handleCtaClick}
          data-campaign-track-click="true"
          data-tracking-target-type="cta"
          data-tracking-target-id={`${module.id}:cta`}
          data-tracking-label={module.cta.label}
          data-tracking-destination="conversion"
          data-tracking-content-type="landing_cta"
          data-tracking-content-id={`${module.id}:cta:content`}
          data-tracking-output-port-id="outputs.click"
        >
          {module.cta.label}
        </a>
      </section>
    );
  }

  const style = {
    "--landing-module-aspect-ratio": module.style.aspectRatio,
    "--landing-module-max-width": module.style.maxWidth,
  } as CSSProperties;

  return (
    <section
      className={module.className}
      style={style}
      aria-label={module.label}
      data-pointer-policy={module.pageInteractionPolicy.pointerEvents}
      data-page-scroll={module.pageInteractionPolicy.pageScroll}
      data-iframe-activation={module.pageInteractionPolicy.iframeActivation}
      data-exposure-surface="landing"
      data-exposure-placement="source-short"
    >
      {module.mediaElement === "video" ? (
        <video
          src={module.mediaUrl}
          controls={module.playbackControls.nativeControls}
          autoPlay={module.playback.autoplay}
          muted={module.playback.muted}
          loop={module.playback.loop}
          playsInline
          preload="metadata"
          controlsList="nodownload"
          aria-label={module.label}
          onPlay={playbackInstrumentation.handlePlay}
          onPause={playbackInstrumentation.handlePause}
          onVolumeChange={playbackInstrumentation.handleVolumeChange}
          onTimeUpdate={playbackInstrumentation.handleTimeUpdate}
          onEnded={playbackInstrumentation.handleEnded}
        />
      ) : (
        <iframe
          src={module.mediaUrl}
          title={module.label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          tabIndex={0}
        />
      )}
    </section>
  );
}

function useCampaignSurfaceTrackingClient(campaign: CampaignDraft) {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return createCampaignSurfaceTrackingClient({
      campaign,
      url: window.location.href,
      campaignStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
      fetch: window.fetch.bind(window),
    });
  }, [campaign]);
}

function getCampaignOfferHref(campaign: CampaignDraft) {
  return (
    campaign.productOffer.attribution.trackingUrl.trim() ||
    campaign.productOffer.offer.destinationUrl.trim() ||
    campaign.productOffer.product.canonicalUrl.trim()
  );
}

function useCampaignSurfaceModuleExposure(
  campaign: CampaignDraft,
  module: CampaignLandingPageRenderedModule,
  trackingClient: CampaignSurfaceTrackingClient | null,
) {
  const emittedExposureIds = useRef(new Set<string>());

  useEffect(() => {
    if (
      trackingClient === null ||
      emittedExposureIds.current.has(module.id)
    ) {
      return;
    }

    emittedExposureIds.current.add(module.id);

    if (module.type === "embedded-short-form-content") {
      void trackingClient.emitExposure(
        createCampaignSurfaceModuleExposureInput({
          campaign,
          moduleId: module.id,
          moduleLabel: module.label,
          sourceContentId: module.tracking.sourceContentId,
          sourceAssetId: module.tracking.sourceAssetId,
          url: module.mediaUrl,
          placement: "source-short",
        }),
      );
      return;
    }

    void trackingClient.emitExposure(
      createCampaignSurfaceModuleExposureInput({
        campaign,
        moduleId: module.id,
        moduleLabel: module.label,
        sourceContentId: module.sourceModuleId,
        placement: "continuation",
      }),
    );
  }, [campaign, module, trackingClient]);
}

function useCampaignShortFormPlaybackInstrumentation({
  campaign,
  module,
  trackingClient,
}: {
  campaign: CampaignDraft;
  module: CampaignLandingPageRenderedModule;
  trackingClient: CampaignSurfaceTrackingClient | null;
}) {
  const emittedDepths = useRef(new Set<number>());
  const completed = useRef(false);
  const previousTime = useRef(0);
  const previousMuted = useRef<boolean | null>(null);

  function emitPlaybackEngagement(input: {
    action: "watch_depth" | "complete" | "replay";
    value: number;
    unit: "percent" | "count";
    metadata: Record<string, unknown>;
  }) {
    if (trackingClient === null || module.type !== "embedded-short-form-content") {
      return;
    }

    void trackingClient.emitEngagement(
      createCampaignSurfacePlaybackEngagementInput({
        campaign,
        moduleId: module.id,
        moduleLabel: module.label,
        sourceContentId: module.tracking.sourceContentId,
        sourceAssetId: module.tracking.sourceAssetId,
        url: module.mediaUrl,
        action: input.action,
        value: input.value,
        unit: input.unit,
        metadata: input.metadata,
      }),
    );
  }

  function emitControlEngagement(
    video: HTMLVideoElement,
    control: "play" | "pause" | "mute" | "unmute",
    metadata?: Record<string, unknown>,
  ) {
    if (trackingClient === null || module.type !== "embedded-short-form-content") {
      return;
    }

    void trackingClient.emitEngagement(
      createCampaignSurfacePlaybackControlEngagementInput({
        campaign,
        moduleId: module.id,
        moduleLabel: module.label,
        sourceContentId: module.tracking.sourceContentId,
        sourceAssetId: module.tracking.sourceAssetId,
        url: module.mediaUrl,
        control,
        currentTimeSeconds: video.currentTime,
        durationSeconds: Number.isFinite(video.duration)
          ? video.duration
          : undefined,
        metadata,
      }),
    );
  }

  function handlePlay(event: SyntheticEvent<HTMLVideoElement>) {
    emitControlEngagement(event.currentTarget, "play");
  }

  function handlePause(event: SyntheticEvent<HTMLVideoElement>) {
    if (event.currentTarget.ended) {
      return;
    }

    emitControlEngagement(event.currentTarget, "pause");
  }

  function handleVolumeChange(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const muted = video.muted || video.volume === 0;

    if (previousMuted.current === muted) {
      return;
    }

    previousMuted.current = muted;
    emitControlEngagement(video, muted ? "mute" : "unmute", {
      muted,
      volume: video.volume,
    });
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    if (duration <= 0) {
      previousTime.current = video.currentTime;
      return;
    }

    const currentTime = video.currentTime;
    const depth = Math.min(100, Math.max(0, (currentTime / duration) * 100));

    for (const threshold of [25, 50, 75]) {
      if (depth >= threshold && !emittedDepths.current.has(threshold)) {
        emittedDepths.current.add(threshold);
        emitPlaybackEngagement({
          action: "watch_depth",
          value: threshold,
          unit: "percent",
          metadata: {
            currentTimeSeconds: currentTime,
            durationSeconds: duration,
          },
        });
      }
    }

    if (depth >= 95 && !completed.current) {
      completed.current = true;
      emitPlaybackEngagement({
        action: "complete",
        value: 100,
        unit: "percent",
        metadata: {
          currentTimeSeconds: currentTime,
          durationSeconds: duration,
        },
      });
    }

    if (previousTime.current > duration * 0.8 && currentTime < duration * 0.2) {
      completed.current = false;
      emittedDepths.current.clear();
      emitPlaybackEngagement({
        action: "replay",
        value: 1,
        unit: "count",
        metadata: {
          previousTimeSeconds: previousTime.current,
          currentTimeSeconds: currentTime,
          durationSeconds: duration,
        },
      });
    }

    previousTime.current = currentTime;
  }

  function handleEnded(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    if (!completed.current) {
      completed.current = true;
      emitPlaybackEngagement({
        action: "complete",
        value: 100,
        unit: "percent",
        metadata: {
          currentTimeSeconds: video.currentTime,
          durationSeconds: duration,
        },
      });
    }
  }

  return {
    handlePlay,
    handlePause,
    handleVolumeChange,
    handleTimeUpdate,
    handleEnded,
  };
}

function useCampaignSurfaceScrollEngagement(
  campaign: CampaignDraft,
  trackingClient: CampaignSurfaceTrackingClient | null,
) {
  const emittedDepths = useRef(new Set<number>());

  useEffect(() => {
    if (trackingClient === null || typeof window === "undefined") {
      return;
    }

    const client = trackingClient;

    function handleScroll() {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollableHeight = scrollHeight - viewportHeight;

      if (scrollableHeight <= 0) {
        return;
      }

      const depth = Math.min(
        100,
        Math.max(0, Math.floor((window.scrollY / scrollableHeight) * 100)),
      );

      for (const threshold of [25, 50, 75, 100]) {
        if (depth < threshold || emittedDepths.current.has(threshold)) {
          continue;
        }

        emittedDepths.current.add(threshold);
        void client.emitEngagement(
          createCampaignSurfaceScrollEngagementInput({
            campaign,
            surfaceId: "landing-page",
            surfaceLabel: campaign.title || "Campaign landing",
            action: "depth",
            value: threshold,
            unit: "percent",
            metadata: {
              scrollY: window.scrollY,
              scrollHeight,
              viewportHeight,
            },
          }),
        );
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [campaign, trackingClient]);
}

function getAssetNativeAspectRatio(
  asset: CampaignAsset,
): "9:16" | "1:1" | "16:9" | "4:5" {
  const dimensions = asset.generatedMetadata?.dimensions;

  if (dimensions === undefined || dimensions.width <= 0 || dimensions.height <= 0) {
    return "9:16";
  }

  const ratio = dimensions.width / dimensions.height;

  if (Math.abs(ratio - 1) < 0.04) {
    return "1:1";
  }

  if (Math.abs(ratio - 16 / 9) < 0.06) {
    return "16:9";
  }

  if (Math.abs(ratio - 4 / 5) < 0.06) {
    return "4:5";
  }

  return "9:16";
}
