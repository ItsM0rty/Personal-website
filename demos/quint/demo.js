import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import {
  QuintProvider,
  BlockRenderer,
  useAddBlock,
} from "https://esm.sh/@itsm0rty/quint@0.1.0?external=react,react-dom";

const h = React.createElement;

const scenarios = [
  {
    id: "refund",
    label: "Refund",
    eyebrow: "Order support",
    message: "A customer says their $45 item arrived damaged. What should happen next?",
    choices: [
      {
        choiceId: "approve-full",
        label: "Approve $45 refund",
        directionality: "in-n-out",
        reveal: true,
        hiddenContent: "The refund is queued. The customer sees this confirmation here.",
        inputData: {
          action: "approve_refund",
          amount_usd: 45,
          reason: "damaged_item",
        },
      },
      {
        choiceId: "offer-partial",
        label: "Offer $25 refund",
        directionality: "in",
        reveal: false,
        inputData: {
          action: "offer_partial_refund",
          amount_usd: 25,
          reason: "damaged_item",
        },
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    eyebrow: "Order support",
    message: "The customer needs a delivery slot for tomorrow. Choose a path.",
    choices: [
      {
        choiceId: "book-slot",
        label: "Book 10:00 to 12:00",
        directionality: "in-n-out",
        reveal: true,
        hiddenContent: "The 10:00 to 12:00 slot is held while the order is confirmed.",
        inputData: {
          action: "reserve_delivery_slot",
          date: "tomorrow",
          window: "10:00-12:00",
        },
      },
      {
        choiceId: "find-slots",
        label: "Find other slots",
        directionality: "in",
        reveal: false,
        inputData: {
          action: "list_delivery_slots",
          date: "tomorrow",
        },
      },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    eyebrow: "Workspace",
    message: "This project is complete. Do you want to archive it?",
    choices: [
      {
        choiceId: "archive-project",
        label: "Archive project",
        directionality: "in-n-out",
        reveal: true,
        hiddenContent: "The project moves to archive. Its files remain available to the team.",
        inputData: {
          action: "archive_project",
          project_id: "northstar",
        },
      },
      {
        choiceId: "keep-active",
        label: "Keep active",
        directionality: "out",
        reveal: true,
        hiddenContent: "Nothing changes. The project stays in the active workspace.",
      },
    ],
  },
];

function outputFor(choice) {
  if (choice.reveal) {
    return choice.hiddenContent;
  }

  return "The assistant adds the next response to the main chat stream.";
}

function ScenarioBlock({ scenario }) {
  const addBlock = useAddBlock();
  const block = {
    blockId: scenario.id,
    content: scenario.message,
    choices: scenario.choices,
  };

  useEffect(() => {
    addBlock({
      blockId: scenario.id,
      content: scenario.message,
      choices: scenario.choices,
    });
  }, [addBlock, scenario]);

  return h(BlockRenderer, { block });
}

function Inspector({ activity }) {
  const latest = activity[0];

  return h(
    "aside",
    { className: "quint-inspector", "aria-live": "polite" },
    h("div", { className: "quint-inspector__head" },
      h("p", { className: "label" }, "Decision inspector"),
      h("p", null, latest ? "Last decision" : "Waiting for a decision")
    ),
    latest
      ? h(
          React.Fragment,
          null,
          h("section", { className: "quint-inspector__field" },
            h("p", { className: "label" }, "Model receives"),
            latest.inputData
              ? h("pre", null, JSON.stringify(latest.inputData, null, 2))
              : h("p", { className: "quint-inspector__empty" }, "Nothing. This decision stays in the interface.")
          ),
          h("section", { className: "quint-inspector__field" },
            h("p", { className: "label" }, "User sees"),
            h("p", null, latest.visibleOutput)
          ),
          h("section", { className: "quint-inspector__field" },
            h("p", { className: "label" }, "Rendered"),
            h("p", null, latest.reveal ? "Inline below the selected button." : "In the main chat stream.")
          ),
          h("div", { className: "quint-inspector__history" },
            h("p", { className: "label" }, "This session"),
            h("ol", null, activity.map((entry, index) =>
              h("li", { key: `${entry.choiceId}-${index}` },
                h("span", null, entry.label),
                h("span", null, entry.directionality)
              )
            ))
          )
        )
      : h("p", { className: "quint-inspector__placeholder" }, "Choose an option in the chat. The click contract will appear here.")
  );
}

function Demo() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [activity, setActivity] = useState([]);
  const scenario = scenarios.find((item) => item.id === scenarioId);

  function selectScenario(id) {
    setScenarioId(id);
    setActivity([]);
  }

  function recordDecision(event) {
    const choice = scenario.choices.find((item) => item.choiceId === event.choiceId);
    setActivity((current) => [
      {
        ...event,
        label: choice.label,
        visibleOutput: outputFor(choice),
      },
      ...current,
    ]);
  }

  return h(
    "div",
    { className: "quint-demo__shell" },
    h("div", { className: "quint-chat" },
      h("div", { className: "quint-chat__bar" },
        h("div", null,
          h("p", { className: "label" }, scenario.eyebrow),
          h("p", null, "Assistant")
        ),
        h("span", { className: "quint-chat__status" }, "Connected")
      ),
      h("div", { className: "quint-scenario-tabs", role: "tablist", "aria-label": "Demo scenarios" },
        scenarios.map((item) =>
          h("button", {
            key: item.id,
            type: "button",
            role: "tab",
            "aria-selected": item.id === scenarioId,
            onClick: () => selectScenario(item.id),
          }, item.label)
        )
      ),
      h("div", { className: "quint-message" },
        h("p", { className: "quint-message__avatar", "aria-hidden": "true" }, "Q"),
        h("div", { className: "quint-message__body" },
          h("p", { className: "label" }, "Assistant message"),
          h(
            QuintProvider,
            { key: scenario.id, onChoiceActivated: recordDecision },
            h(ScenarioBlock, { scenario })
          )
        )
      ),
      activity[0] && !activity[0].reveal
        ? h("div", { className: "quint-global-message" },
            h("p", { className: "label" }, "Main chat stream"),
            h("p", null, activity[0].visibleOutput)
          )
        : null
    ),
    h(Inspector, { activity })
  );
}

const root = document.getElementById("quint-root");
createRoot(root).render(h(Demo));
