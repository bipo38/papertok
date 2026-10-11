import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lock, Minus, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAnalyticsConsent } from '../../context/AnalyticsContext';
import { CATEGORIES } from '../../data/categories';
import {
  HandleUnavailableError,
  PROFILE_VISIBILITY,
  USER_PROFILE_LIMITS,
  createUserProfile,
  readOwnUserProfile,
} from '../../services/userProfileService.js';
import { HANDLE_ERROR_MESSAGES, HANDLE_MAX_LENGTH, inspectHandle } from '../../utils/userHandle.js';
import { GUEST_SEED_PER_AREA, guestSeedCategoriesForAreas, readGuestInterests } from '../../utils/guestInterests.js';
import { USER_PREFERENCES_MAX } from '../../utils/accountOnboarding.js';
import { getSiteRootUrl } from '../../utils/publicNavigation.js';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerHandle, DrawerTitle } from '../ui/drawer.jsx';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../ui/popover.jsx';
import VisibilityList from '../Profile/VisibilityList.jsx';
import RingMeter from './RingMeter.jsx';
import '../Profile/ProfileEditor.css';
import './OnboardingFlow.css';



const AREAS = Object.entries(CATEGORIES);
const TOTAL = AREAS.reduce((n, [, area]) => n + Object.keys(area.subcategories).length, 0);
const STEPS = [
  { label: 'Interests' },
  { label: 'Profile' },
];


const areaAccent = area => ({ '--area-accent': area.gradient });

const plural = (n, one, many) => (n === 1 ? one : many);


const PHONE_QUERY = '(max-width: 600px)';
function useIsPhone() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
  );
}


function ProfilePagePreview({ displayName, handle, visibility, initial }) {
  const isPrivate = visibility === PROFILE_VISIBILITY.private;
  return (
    <div className="ob-preview" aria-hidden="true">
      <span className="profile-preview-label">Your public page</span>
      <div className="profile-preview-card ob-window">
        <div className="ob-window-bar">
          <span className="ob-window-dots"><span /><span /><span /></span>
          <span className="ob-window-address">
            <Lock size={10} weight="bold" />
            <span className="ob-window-url">
              {`${getSiteRootUrl().replace(/^https?:\/\//, '')}public/user/`}
              <span className="ob-preview-handle">{handle}</span>
            </span>
          </span>
        </div>
        <div className="profile-preview-body">
          <div className="profile-preview-identity">
            <div className="profile-preview-avatar"><span>{initial}</span></div>
            <div className="profile-preview-name">
              <strong>{displayName || '—'}</strong>
              <span className={handle ? '' : 'ob-handle-empty'}>@{handle}</span>
            </div>
            <span className={`profile-preview-badge ob-window-badge${isPrivate ? ' is-private' : ''}`}>
              {isPrivate ? <><Lock size={11} /> Private</> : 'Public'}
            </span>
          </div>
          <p className="profile-preview-bio is-empty">No bio yet. You can add one from Settings.</p>
          <div className="profile-preview-lists">
            <span className="profile-preview-lists-label">Lists</span>
            <p className="profile-preview-empty">No lists on your profile yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


let titleArrowDrawn = false;

export default function OnboardingFlow() {
  // What this visitor said they were into before they had an account
  // (GuestWelcome, or the header chip's GuestInterestsPrompt). Read once: the
  // answer is the starting point, not a live source. With an answer, the
  // interests are settled — the first five categories of every area they
  // picked, or exactly the topics they narrowed an area to on the welcome
  // (`guestSeedCategoriesForAreas`) — and the flow opens on the profile step,
  // the only thing the guest has not been asked yet; the stepper still goes
  // back to the interests. AuthContext clears the answer once
  // completeOnboarding has written it to the profile.
  const [guestSeed] = useState(() => {
    const stored = readGuestInterests();
    return stored?.areas.length ? stored.areas : null;
  });
  const [guestSeedTopics] = useState(() => readGuestInterests()?.topics ?? []);
  const [picked, setPicked] = useState(
    () => new Set(guestSeedCategoriesForAreas(guestSeed ?? [], GUEST_SEED_PER_AREA, guestSeedTopics)),
  );

  const { completeOnboarding, onboardingComplete, user, signOut } = useAuth();
  const { language } = useLanguage();
  const { trackEvent, markActivation } = useAnalyticsConsent();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = typeof location.state?.returnTo === 'string'
    && location.state.returnTo.startsWith('/')
    && !location.state.returnTo.startsWith('//')
    ? location.state.returnTo
    : '/feed';
  const isPhone = useIsPhone();

  const [existingProfile, setExistingProfile] = useState(false);
  const steps = existingProfile ? STEPS.slice(0, 1) : STEPS;
  const [stepState, setStepState] = useState(guestSeed ? 2 : 1);
  const step = Math.min(stepState, steps.length);


  const [direction, setDirection] = useState(null);
  const [arrowDrawn, setArrowDrawn] = useState(() => titleArrowDrawn);

  const stepHeadingRef = useRef(null);
  useEffect(() => {
    if (direction) stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step, direction]);
  const setStep = (next) => {
    if (next === step) return;
    if (next !== 1) {
      titleArrowDrawn = true;
      setArrowDrawn(true);
    }
    setDirection(next > step ? 'forward' : 'back');
    setStepState(next);
  };


  const [sheetArea, setSheetArea] = useState(null);
  const [displayName, setDisplayName] = useState(
    () => (user?.displayName ? String(user.displayName).slice(0, USER_PROFILE_LIMITS.displayName) : ''),
  );
  const [handleDraft, setHandleDraft] = useState('');

  const [handleTouched, setHandleTouched] = useState(false);
  const [finishTried, setFinishTried] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState(PROFILE_VISIBILITY.private);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const profileCreated = useRef(false);

  useEffect(() => {
    if (onboardingComplete) navigate(returnTo, { replace: true });
  }, [onboardingComplete, navigate, returnTo]);

  useEffect(() => {
    let active = true;
    readOwnUserProfile()
      .then(profile => { if (active) setExistingProfile(Boolean(profile)); })
      .catch(() => { if (active) setExistingProfile(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    trackEvent('tutorial_begin', { language });
  }, [language, trackEvent]);

  const byArea = useMemo(() => AREAS.map(([key, area]) => {
    const ids = Object.keys(area.subcategories);
    return { key, area, ids, chosen: ids.filter(id => picked.has(id)) };
  }), [picked]);
  const areasWithPicks = byArea.filter(row => row.chosen.length > 0);
  const sheetRow = byArea.find(row => row.key === sheetArea);

  const overCap = picked.size > USER_PREFERENCES_MAX;
  const canContinue = picked.size > 0 && !overCap;

  const handleCheck = useMemo(() => inspectHandle(handleDraft), [handleDraft]);
  const handleError = handleDraft && !handleCheck.valid ? HANDLE_ERROR_MESSAGES[handleCheck.code] : '';
  const isPublic = visibilityDraft === PROFILE_VISIBILITY.public;
  const needsHandle = isPublic && !handleCheck.valid;
  const needsName = isPublic && !displayName.trim();
  const showHandleRequired = needsHandle && !handleError && (handleTouched || finishTried);
  const showNameRequired = needsName && finishTried;
  const profileReady = existingProfile || !isPublic || (handleCheck.valid && Boolean(displayName.trim()));

  const togglePick = id => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = row => setPicked(prev => {
    const next = new Set(prev);
    const all = row.chosen.length === row.ids.length;
    row.ids.forEach(id => (all ? next.delete(id) : next.add(id)));
    return next;
  });

  const handleFinish = async () => {
    if (overCap || saving) return;
    if (!profileReady) {
      setFinishTried(true);
      return;
    }

    setSaving(true);
    setProfileError(null);
    try {
      if (!existingProfile && !profileCreated.current && visibilityDraft === PROFILE_VISIBILITY.public) {
        await createUserProfile({
          handle: handleCheck.handle,
          displayName: displayName.trim(),
          bio: '',
          allowContact: false,
          photo: '',
          visibility: PROFILE_VISIBILITY.public,
        });
        profileCreated.current = true;
      }
      await completeOnboarding(Array.from(picked));
      trackEvent('tutorial_complete', { language });
      markActivation();
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof HandleUnavailableError) {
        setProfileError('That handle is already taken. Try another.');
      } else if (err?.code === 'ONBOARDING_WRITE_TIMEOUT') {
        // completeOnboarding's write is a merge-set of the same fields, and
        // profileCreated (above) already stops a second profile claim, so
        // the reader's own retry is the whole recovery — nothing to do here
        // but tell them why the button stopped spinning.
        setProfileError('Still saving. Check your connection and try again.');
      } else {
        console.error('Error saving preferences:', err);
        setProfileError('Could not save. Try again.');
      }
      setSaving(false);
    }
  };


  const cardBody = (row) => {
    const has = row.chosen.length > 0;
    return (
      <>
        <span className="area-card-top">
          <span className="area-card-icon"><row.area.icon size={20} aria-hidden="true" /></span>
          <span className="area-card-count">
            {has ? `${row.chosen.length} of ${row.ids.length}` : `${row.ids.length} cat.`}
          </span>
          <span className="area-card-box" aria-hidden="true">
            {row.chosen.length === row.ids.length
              ? <Check size={11} weight="bold" />
              : has && <Minus size={11} weight="bold" />}
          </span>
        </span>
        <span className="area-card-name"><span>{row.area.label}</span></span>
        <span className="area-card-desc">{row.area.description}</span>
      </>
    );
  };


  const pickerBody = (row, Close) => (
    <>

      <fieldset className="ob-checklist">
        <legend className="visually-hidden">{row.area.label} categories</legend>
        {row.ids.map(id => (
          <label key={id} className="ob-check-row">
            <input type="checkbox" checked={picked.has(id)} onChange={() => togglePick(id)} />
            <span className="ob-check-box" aria-hidden="true"><Check size={11} weight="bold" /></span>
            <span>{row.area.subcategories[id].label}</span>
          </label>
        ))}
      </fieldset>
      <div className="ob-sheet-actions">
        <button type="button" className="ob-text-button" onClick={() => toggleAll(row)}>
          {row.chosen.length === row.ids.length ? 'Deselect all' : `Select all ${row.ids.length}`}
        </button>
        <Close render={<Button size="sm" />}>Done</Close>
      </div>
    </>
  );

  const overCapText = overCap
    ? `At most ${USER_PREFERENCES_MAX} categories: drop ${picked.size - USER_PREFERENCES_MAX}.`
    : '';
  // The step's main action. With no profile step left, step 1 finishes.
  const lastStep = step === steps.length;
  const primaryButton = lastStep ? (
    <Button
      className="ob-primary"
      disabled={saving || overCap || (step === 1 && !canContinue)}
      onClick={handleFinish}
    >
      {saving ? 'Saving…' : 'Finish'}
      {!saving && <Check size={16} weight="bold" aria-hidden="true" />}
    </Button>
  ) : (
    <Button
      className="ob-primary ob-continue"
      disabled={!canContinue}
      onClick={() => setStep(2)}
    >
      Continue <ArrowRight size={16} aria-hidden="true" />
    </Button>
  );

  const saveError = (
    <p className="ob-save-error" role="alert">{profileError || ''}</p>
  );

  return (
    <div className="onboarding ob">
      <div className="onboarding-paper" aria-hidden="true" />

      <header className="onboarding-bar">
        <span className="onboarding-brand">
          <span className="onboarding-mark">PT</span>
          <span className="onboarding-wordmark">Paper<span>Tok</span></span>
        </span>

        <Button
          variant="outline"
          size="sm"
          className="onboarding-signout"
          onClick={async () => { await signOut(); navigate('/feed', { replace: true }); }}
          disabled={saving}
        >
          <SignOut size={16} aria-hidden="true" />
          Log out
        </Button>
      </header>

      <div className="onboarding-body">
        {steps.length > 1 && (
          <nav className="ob-progress" aria-label="Progress">
            <ol>
              {steps.map((item, i) => {
                const target = i + 1;
                const current = target === step;
                const reachable = target < step || (target === 2 && canContinue);
                return (
                  <li key={item.label} className={current ? 'is-active' : target < step ? 'is-done' : ''}>
                    <button
                      type="button"
                      className="ob-progress-step"
                      aria-current={current ? 'step' : undefined}
                      disabled={!current && !reachable}
                      onClick={() => { if (!current && reachable) setStep(target); }}
                    >
                      <span className="ob-progress-n" aria-hidden="true">{target}</span>
                      {item.label}
                      {target < step && <span className="visually-hidden"> (completed)</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {step === 1 && (
          <div className={`ob-interests${direction ? ` ob-step-in is-${direction}` : ''}`}>
            <div className="ob-main">
              <h1 className="onboarding-title" ref={stepHeadingRef} tabIndex={-1}>
                <span className="ob-title-anchor">
                  Choose your areas of interest
                  <svg className={`ob-title-arrow${arrowDrawn ? ' is-drawn' : ''}`} viewBox="0 0 160 112" aria-hidden="true" focusable="false">
                    <path
                      className="ob-title-arrow-line"
                      pathLength="1"
                      d="M2 8 C 22 3, 48 1, 74 3 C 96 5, 116 12, 128 26 C 138 38, 140 54, 138 70 C 137 82, 136 92, 134 101"
                    />
                    <path
                      className="ob-title-arrow-line is-second"
                      pathLength="1"
                      d="M6 11 C 30 6, 58 5, 82 8 C 102 11, 118 18, 128 31 C 135 42, 137 56, 136 69"
                    />
                    <path
                      className="ob-title-arrow-head"
                      pathLength="1"
                      d="M122 88 C 125 92, 130 98, 134 104 C 137 99, 142 93, 148 87"
                    />
                  </svg>
                </span>
              </h1>
              <p className="onboarding-lede">
                This is what your feed is built from. Mark the ones you care about — next you narrow down the
                specific categories, and you can change it any time from Settings.
              </p>

              <ul className="ob-cards">
                {byArea.map(row => {
                  const style = areaAccent(row.area);
                  const pressed = row.chosen.length > 0 ? '' : undefined;
                  if (isPhone) {
                    return (
                      <li key={row.key}>
                        <button
                          type="button"
                          className="area-card ob-sheet-card"
                          data-pressed={pressed}
                          aria-haspopup="dialog"
                          onClick={() => setSheetArea(row.key)}
                          style={style}
                        >
                          {cardBody(row)}
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={row.key}>
                      <Popover>
                        <PopoverTrigger className="area-card ob-sheet-card" data-pressed={pressed} style={style}>
                          {cardBody(row)}
                        </PopoverTrigger>
                        <PopoverContent
                          className="ob-popover"
                          align="start"
                          aria-label={`${row.area.label} categories`}
                          style={style}
                        >
                          <p className="ob-popover-title">{row.area.label}</p>
                          {pickerBody(row, PopoverClose)}
                        </PopoverContent>
                      </Popover>
                    </li>
                  );
                })}
              </ul>
            </div>

            <aside className="ob-summary" aria-label="Your selection">
              <RingMeter
                value={picked.size}
                total={TOTAL}
                label={plural(picked.size, 'Category', 'Categories')}
                sub={`in ${areasWithPicks.length} of ${AREAS.length} areas`}
                widestLabel="Categories"
                widestSub={`in ${AREAS.length} of ${AREAS.length} areas`}
              />

              <ul className="ob-summary-list">
                {areasWithPicks.length === 0 && <li className="is-empty">No areas yet</li>}
                {areasWithPicks.map(({ key, area, chosen }) => (
                  <li key={key} style={areaAccent(area)}>
                    <span>{area.label}</span>
                    <b>{chosen.length}</b>
                  </li>
                ))}
              </ul>

              <p className="ob-summary-hint" aria-live="polite">{overCapText}</p>
              {lastStep && saveError}
              {primaryButton}
            </aside>
          </div>
        )}


        {isPhone && (
          <Drawer open={Boolean(sheetRow)} onOpenChange={next => { if (!next) setSheetArea(null); }}>
            {sheetRow && (
              <DrawerContent className="ob-bottom" style={areaAccent(sheetRow.area)}>
                <DrawerHandle />
                <DrawerBody className="ob-bottom-body">
                  <DrawerTitle>{sheetRow.area.label}</DrawerTitle>
                  <p className="ob-side-desc">{sheetRow.area.description}</p>
                  {pickerBody(sheetRow, DrawerClose)}
                </DrawerBody>
              </DrawerContent>
            )}
          </Drawer>
        )}

        {step === 2 && (
          <div className={`ob-interests ob-step-profile${direction ? ` ob-step-in is-${direction}` : ''}`}>
            <div className="ob-profile">
              <h1 className="onboarding-title" ref={stepHeadingRef} tabIndex={-1}>Your profile</h1>
              <p className="onboarding-lede">How you appear to other readers. You can change all of it later in Settings.</p>

              <div className="ob-fields">
                <div className="profile-field">
                  <Label htmlFor="onboarding-display-name">Display name</Label>

                  <Input
                    id="onboarding-display-name"
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    maxLength={USER_PROFILE_LIMITS.displayName}
                    autoComplete="name"
                    aria-invalid={showNameRequired ? 'true' : undefined}
                    aria-required={isPublic ? 'true' : undefined}
                    aria-describedby="onboarding-display-name-hint"
                    disabled={!isPublic}
                  />
                  <p id="onboarding-display-name-hint" className={`profile-hint${showNameRequired ? ' is-error' : ''}`} aria-live="polite">
                    {!isPublic
                      ? 'Only saved with a public profile.'
                      : showNameRequired ? 'A public profile needs a display name.' : ''}
                  </p>
                </div>
                <div className="profile-field">
                  <Label htmlFor="onboarding-handle">Handle</Label>
                  <div className="profile-handle-input">
                    <span aria-hidden="true">@</span>
                    <Input
                      id="onboarding-handle"
                      value={handleDraft}
                      onChange={event => {
                        setHandleTouched(true);
                        setHandleDraft(event.target.value.toLowerCase());
                        // "Already taken" was about the previous handle.
                        setProfileError(null);
                      }}
                      maxLength={HANDLE_MAX_LENGTH}
                      autoComplete="off"
                      spellCheck="false"
                      aria-required={isPublic ? 'true' : undefined}
                      aria-invalid={isPublic && (Boolean(handleError) || showHandleRequired) ? 'true' : undefined}
                      aria-describedby="onboarding-handle-hint"
                      disabled={!isPublic}
                    />
                  </div>

                  <p id="onboarding-handle-hint" className={`profile-hint${handleError || showHandleRequired ? ' is-error' : ''}`} aria-live="polite">
                    {!isPublic
                      ? 'Only needed for a public profile. Choose Public below to set one.'
                      : handleError || (showHandleRequired
                        ? 'Required for a public profile.'
                        : 'Lowercase letters, numbers and underscores.')}
                  </p>
                </div>
                <div>
                  <p className="ob-question" aria-hidden="true">Who can see your profile?</p>
                  <VisibilityList
                    value={visibilityDraft}
                    onChange={next => {
                      setVisibilityDraft(next);
                      setHandleTouched(false);
                      setFinishTried(false);
                      setProfileError(null);
                    }}
                    idPrefix="onboarding-visibility"
                    privateFirst
                  />
                </div>
              </div>
            </div>


            <aside className="ob-summary ob-summary--profile" aria-label="Preview of your public page">
              <ProfilePagePreview
                displayName={displayName.trim()}
                handle={isPublic ? (handleCheck.valid ? handleCheck.handle : handleDraft) : ''}
                visibility={visibilityDraft}
                initial={(displayName || user?.email || '?').trim().charAt(0).toUpperCase()}
              />
              {saveError}

              <div className="ob-actions is-summary">
                <Button
                  variant="ghost"
                  size="icon"
                  className="ob-back-icon"
                  onClick={() => setStep(1)}
                  aria-label="Back to interests"
                  title="Back to interests"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </Button>
                <p className="ob-actions-summary">
                  <strong>{displayName.trim() || 'No name yet'}</strong>
                  <span>
                    {isPublic ? 'Public' : 'Private'}
                    {' · '}{picked.size} {plural(picked.size, 'category', 'categories')}
                  </span>
                </p>
                {primaryButton}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
