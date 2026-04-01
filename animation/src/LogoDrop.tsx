import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const LogoDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === FALL: straight down, fast ===
  const FALL_END = 18;
  const fallProgress = interpolate(frame, [0, FALL_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t,
  });
  const fallY = interpolate(fallProgress, [0, 1], [-450, 0]);

  // === STRETCH during fall ===
  const stretchAmount = frame < FALL_END
    ? interpolate(fallProgress, [0, 0.2, 1], [1, 1, 1.8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const narrowAmount = frame < FALL_END
    ? interpolate(fallProgress, [0, 0.2, 1], [1, 1, 0.55], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // === SQUASH on impact ===
  const impactFrame = frame - FALL_END;
  const squashSpring = spring({
    frame: impactFrame,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.6 },
  });
  const squashScaleX = frame >= FALL_END
    ? interpolate(squashSpring, [0, 1], [2.2, 1])
    : narrowAmount;
  const squashScaleY = frame >= FALL_END
    ? interpolate(squashSpring, [0, 1], [0.2, 1])
    : stretchAmount;

  // === BOUNCE after impact ===
  const bounceSpring = spring({
    frame: impactFrame,
    fps,
    config: { damping: 14, stiffness: 200, mass: 1 },
  });
  const bounceY = frame >= FALL_END
    ? interpolate(bounceSpring, [0, 0.5, 1], [0, -30, 0])
    : 0;

  const translateY = frame < FALL_END ? fallY : bounceY;

  // === Opacity: quick fade in ===
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === SWING LEFT after settle (frames 45+) ===
  const SWING_START = 45;
  // Anticipation: small nudge right before swinging left
  const anticipateSwing = interpolate(frame, [SWING_START, SWING_START + 4], [0, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t,
  });
  const swingSpring = spring({
    frame: frame - (SWING_START + 4),
    fps,
    config: { damping: 12, stiffness: 120, mass: 1 },
  });
  const swingDrive = frame >= SWING_START + 4
    ? interpolate(swingSpring, [0, 1], [8, -90])
    : anticipateSwing;
  const swingX = frame >= SWING_START ? swingDrive : 0;

  const swingStretchX = 1;
  const swingStretchY = 1;

  // === BRAND NAME — moves left with pin, fades in synced ===
  const nameOpacity = frame >= SWING_START + 4
    ? interpolate(swingSpring, [0, 0.6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  // Text scales in from slightly small — no overshoot
  const nameScaleSpring = spring({
    frame: frame - (SWING_START + 4),
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const nameScale = frame >= SWING_START + 4
    ? interpolate(nameScaleSpring, [0, 1], [0.85, 1])
    : 0.85;

  // === Shadow ===
  const shadowScale = interpolate(frame, [0, FALL_END], [0.2, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shadowOpacity = interpolate(frame, [0, FALL_END], [0.01, 0.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shadowStretchX = frame >= FALL_END ? squashScaleX : shadowScale;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFF8F0",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Drop shadow — follows pin horizontally */}
      <div
        style={{
          position: "absolute",
          top: "56%",
          width: 100,
          height: 10,
          borderRadius: "50%",
          backgroundColor: `rgba(0, 0, 0, ${shadowOpacity})`,
          filter: `blur(${6 - shadowScale * 3}px)`,
          transform: `translateX(${swingX}px) scaleX(${shadowStretchX})`,
        }}
      />

      {/* Pin logo — absolute positioned, swings left */}
      <div
        style={{
          position: "absolute",
          transform: `translateX(${swingX}px) translateY(${translateY}px) scaleX(${squashScaleX * swingStretchX}) scaleY(${squashScaleY * swingStretchY})`,
          transformOrigin: "center bottom",
          opacity,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 140, height: "auto" }}
        />
      </div>

      {/* Brand name — fades in to the right of the pin */}
      <div
        style={{
          position: "absolute",
          opacity: nameOpacity,
          transform: `translateX(${swingX + 138}px) translateY(-8px) scale(${nameScale})`,
          transformOrigin: "left center",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 48,
          fontWeight: 600,
          color: "#2C2520",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        Fundið
      </div>
    </AbsoluteFill>
  );
};
