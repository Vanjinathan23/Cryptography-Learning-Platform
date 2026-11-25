import { useCallback, useState } from 'react';
import { MissionId, PRACTICE_MISSIONS } from '../data/practiceMissions';
import { renderIcon } from '../engine/isoEngine';
import Scenario1GuidedPractice from './Scenario1GuidedPractice';
import Scenario2GuidedPractice from './Scenario2GuidedPractice';
import Scenario3GuidedPractice from './Scenario3GuidedPractice';
import Scenario4GuidedPractice from './Scenario4GuidedPractice';
import Scenario5GuidedPractice from './Scenario5GuidedPractice';

export default function AttackLabView({ theme }: { theme: 'light' | 'dark' }) {
  const [missionIdx, setMissionIdx] = useState(0);
  const [securedMissions, setSecuredMissions] = useState<Set<MissionId>>(() => new Set());

  const mission = PRACTICE_MISSIONS[missionIdx];

  const markMissionSecured = useCallback((id: MissionId) => {
    setSecuredMissions((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSecured1 = useCallback(() => markMissionSecured('m1-chat'), [markMissionSecured]);
  const handleSecured2 = useCallback(() => markMissionSecured('m2-portal'), [markMissionSecured]);
  const handleSecured3 = useCallback(() => markMissionSecured('m3-bank'), [markMissionSecured]);
  const handleSecured4 = useCallback(() => markMissionSecured('m4-update'), [markMissionSecured]);
  const handleSecured5 = useCallback(() => markMissionSecured('m5-vault'), [markMissionSecured]);

  return (
    <div className="guided-shell">
      <div className="lab-head-bar">
        <div>
          <div className="crumb">
            Hands-On Practice <span>/</span> {mission.scenarioLabel}
            <span aria-hidden="true"> · </span>
            <span>
              {securedMissions.size} / {PRACTICE_MISSIONS.length} Scenarios Mastered
            </span>
          </div>
          <h1 className="title">
            Scenario {mission.num}: {mission.title}
          </h1>
        </div>

        <div className="mission-strip" role="tablist" aria-label="Interactive practice scenarios">
          {PRACTICE_MISSIONS.map((m, idx) => {
            const isSolved = securedMissions.has(m.id);
            const isCurrent = idx === missionIdx;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                className={`mission-tab ${isCurrent ? 'is-active' : ''} ${isSolved ? 'is-solved' : ''}`}
                onClick={() => setMissionIdx(idx)}
              >
                <span className="mission-tab__num">{m.num}</span>
                <span className="mission-tab__name">{m.title}</span>
                {isSolved && (
                  <span
                    className="mission-tab__check"
                    dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 12, stroke: 3 }) }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {mission.id === 'm1-chat' && (
        <Scenario1GuidedPractice theme={theme} onSecured={handleSecured1} />
      )}
      {mission.id === 'm2-portal' && (
        <Scenario2GuidedPractice theme={theme} onSecured={handleSecured2} />
      )}
      {mission.id === 'm3-bank' && (
        <Scenario3GuidedPractice theme={theme} onSecured={handleSecured3} />
      )}
      {mission.id === 'm4-update' && (
        <Scenario4GuidedPractice theme={theme} onSecured={handleSecured4} />
      )}
      {mission.id === 'm5-vault' && (
        <Scenario5GuidedPractice theme={theme} onSecured={handleSecured5} />
      )}
    </div>
  );
}
