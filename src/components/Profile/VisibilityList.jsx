import { GlobeHemisphereWest, Lock } from '@phosphor-icons/react';
import { PROFILE_VISIBILITY } from '../../services/userProfileService.js';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import './VisibilityList.css';

const OPTIONS = [
  {
    id: PROFILE_VISIBILITY.public,
    Icon: GlobeHemisphereWest,
    label: 'Public',
    summary: 'Anyone with the link can open your page.',
    details: [
      'Shows your name, bio and pinned lists.',
      'People can follow you.',
      'You appear when signed-in people search users by handle or name.',
    ],
  },
  {
    id: PROFILE_VISIBILITY.private,
    Icon: Lock,
    label: 'Private',
    summary: 'Only you can open your page.',
    details: [
      'Nobody else can open it, signed in or not.',
      'You do not appear in user search.',
    ],
    stillVisibleTitle: 'Still visible when private',
    stillVisible: [
      'Lists you already published stay public by their link; only your name comes off them. Unpublish them in My lists.',
      'Your handle stays reserved, so it can be seen to exist.',
      'Your follower count stays countable.',
    ],
  },
];

function Detail({ option, id }) {
  return (
    <div id={id} className="visibility-list-detail">
      <ul>{option.details.map(item => <li key={item}>{item}</li>)}</ul>
      {option.stillVisible && (
        <>
          <p className="visibility-list-caveat-title">{option.stillVisibleTitle}</p>
          <ul>{option.stillVisible.map(item => <li key={item}>{item}</li>)}</ul>
        </>
      )}
    </div>
  );
}



export default function VisibilityList({
  value, onChange, commitOnPress = false, disabled = false, idPrefix = 'visibility', privateFirst = false,
}) {
  const options = privateFirst ? [...OPTIONS].reverse() : OPTIONS;
  return (
    <RadioGroup
      className="visibility-list"
      aria-label="Who can see your profile?"
      value={value}
      onValueChange={next => { if (!commitOnPress) onChange(next); }}
      disabled={disabled}
    >
      {options.map(option => {
        const { id, Icon, label, summary } = option;
        const checked = value === id;
        const press = commitOnPress ? () => onChange(id) : undefined;
        return (
          <div key={id} className={`visibility-list-item${checked ? ' is-checked' : ''}`}>
            <RadioGroupItem
              value={id}
              id={`${idPrefix}-${id}`}
              render={<button type="button" className="visibility-list-row" onClick={press} />}
              nativeButton
              aria-describedby={checked ? `${idPrefix}-${id}-detail` : undefined}
            >
              <span className="visibility-list-radio" aria-hidden="true" />
              <Icon size={18} weight={checked ? 'fill' : 'regular'} aria-hidden="true" />
              <span className="visibility-list-copy">
                <strong>{label}</strong>
                <span>{summary}</span>
              </span>
            </RadioGroupItem>
            {checked && <Detail option={option} id={`${idPrefix}-${id}-detail`} />}
          </div>
        );
      })}
    </RadioGroup>
  );
}
