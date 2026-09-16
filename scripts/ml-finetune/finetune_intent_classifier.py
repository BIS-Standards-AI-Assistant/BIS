"""
Offline fine-tuning: intent classification (docs/ui/SIH.md §14's "good
fine-tuning target" list -- intent classification, not the generative
LLM itself). Python/PyTorch/Hugging Face, per this project's own rule
that offline training stays in Python while the runtime stays
TypeScript/provider-based (CLAUDE_CODE_EXECUTION.md #4/#5: no Python
runtime inference service in the live app).

Why this model, not the Ollama LLM:
  There is no GPU in this environment (torch.cuda.is_available() ==
  False) and llama3.2:3b has ~3B parameters -- a full or LoRA fine-tune
  of it on CPU is not tractable in any reasonable time, and 20 labeled
  examples could not move a 3B-parameter model's behavior in any
  measurable way regardless. A small (66M-parameter) BERT classifier is
  the model class this repo's own docs actually recommend fine-tuning,
  and it is small enough to train on CPU in well under a minute.
  (An even smaller prajjwal1/bert-tiny was tried first for speed, but
  its repo has no modern fast-tokenizer file and transformers 5.x has
  dropped legacy slow-tokenizer conversion -- distilbert-base-uncased
  is officially maintained and Just Works.)

Why the result is a CANDIDATE, not a capability:
  Training data is data/evaluation/generation-results.json's 20 real
  (query, intent) pairs from this session's own live pipeline runs --
  genuinely real, but 20 examples across 5 imbalanced classes (13 of
  them the same class) is far too small for a held-out test split to
  mean anything. This script reports train-set accuracy and says so
  explicitly, and the resulting checkpoint is NOT wired into any
  runtime path -- src/lib/intent.ts is unchanged and still uses the
  LLM/deterministic-fallback intent path it always has.

Usage:
  .venv-ml/Scripts/python.exe scripts/ml-finetune/finetune_intent_classifier.py
"""

import json
import os
import sys
from pathlib import Path

import torch
from sklearn.metrics import accuracy_score, classification_report
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

ROOT = Path(__file__).resolve().parents[2]
GENERATION_RESULTS = ROOT / "data" / "evaluation" / "generation-results.json"
ARTIFACT_DIR = ROOT / "data" / "ml" / "artifacts" / "intent-classifier-v1"
REGISTRY_PATH = ROOT / "data" / "ml" / "artifacts" / "registry.json"

BASE_MODEL = "distilbert-base-uncased"  # 66M params -- has a modern fast tokenizer; still CPU-feasible for 20 examples


def load_examples():
    rows = json.loads(GENERATION_RESULTS.read_text(encoding="utf-8"))
    examples = []
    for r in rows:
        resp = r.get("response")
        if not resp or not resp.get("intent"):
            continue
        examples.append({"query": r["query"], "intent": resp["intent"]})
    return examples


class IntentDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {k: v[idx] for k, v in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item


def main():
    examples = load_examples()
    if len(examples) < 5:
        print(f"Only {len(examples)} real (query, intent) examples exist -- too few to fine-tune anything. Aborting honestly rather than training on nothing.")
        sys.exit(1)

    labels_sorted = sorted({e["intent"] for e in examples})
    label_to_id = {label: i for i, label in enumerate(labels_sorted)}
    id_to_label = {i: label for label, i in label_to_id.items()}

    print(f"Loaded {len(examples)} real (query, intent) pairs, {len(labels_sorted)} classes: {labels_sorted}")
    counts = {label: sum(1 for e in examples if e["intent"] == label) for label in labels_sorted}
    print(f"Class counts: {counts}")
    print("This is not a held-out-test-worthy dataset (too few examples per class). Reporting train-set fit only.\n")

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL, num_labels=len(labels_sorted)
    )

    texts = [e["query"] for e in examples]
    labels = [label_to_id[e["intent"]] for e in examples]
    encodings = tokenizer(texts, truncation=True, padding=True, return_tensors="pt")
    dataset = IntentDataset(encodings, labels)

    training_args = TrainingArguments(
        output_dir=str(ARTIFACT_DIR / "checkpoints"),
        num_train_epochs=15,
        per_device_train_batch_size=4,
        learning_rate=5e-5,
        logging_steps=5,
        save_strategy="no",
        report_to=[],
        disable_tqdm=False,
    )

    trainer = Trainer(model=model, args=training_args, train_dataset=dataset)
    trainer.train()

    # Train-set fit -- explicitly NOT a held-out evaluation. With 20
    # examples across 5 classes there is no honest way to hold out a test
    # split that would mean anything; this measures whether the model
    # learned the training examples at all, nothing more.
    model.eval()
    with torch.no_grad():
        outputs = model(**encodings)
        preds = torch.argmax(outputs.logits, dim=1).tolist()
    train_accuracy = accuracy_score(labels, preds)
    report = classification_report(
        labels, preds, target_names=labels_sorted, zero_division=0
    )
    print(f"\nTrain-set accuracy (NOT held-out): {train_accuracy:.3f}")
    print(report)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(ARTIFACT_DIR))
    tokenizer.save_pretrained(str(ARTIFACT_DIR))
    (ARTIFACT_DIR / "label_map.json").write_text(
        json.dumps(id_to_label, indent=2), encoding="utf-8"
    )
    print(f"\nSaved checkpoint + tokenizer + label map to {ARTIFACT_DIR}")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    registry.append(
        {
            "modelId": "intent-classifier-candidate-v1",
            "modelName": f"Fine-tuned {BASE_MODEL} for intent classification",
            "version": "v1",
            "artifactPath": str(ARTIFACT_DIR.relative_to(ROOT)).replace("\\", "/"),
            "modelType": "trained_ml",
            "datasetVersion": f"generation-results-{len(examples)}rows",
            "metrics": {
                "trainSetAccuracy": train_accuracy,
                "trainingRows": len(examples),
                "numClasses": len(labels_sorted),
                "classCounts": counts,
                "note": "Train-set fit only, not a held-out evaluation -- 20 examples across 5 classes cannot support one.",
            },
            "createdAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "status": "CANDIDATE",
            "approvedBy": None,
            "checksum": None,
            "notes": (
                f"Fine-tuned offline in Python (scripts/ml-finetune/finetune_intent_classifier.py), "
                f"base model {BASE_MODEL} (66M params, chosen for CPU feasibility -- no GPU in this "
                f"environment, no LoRA of the 3B Ollama LLM is tractable here). NOT wired into "
                f"src/lib/intent.ts or any runtime path -- this repo's own execution contract "
                f"forbids a Python runtime inference service in the live app. Checkpoint exists "
                f"purely as offline infrastructure/proof that the fine-tuning pipeline runs "
                f"end-to-end on real data, not as a production capability."
            ),
        }
    )
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    print(f"Registered intent-classifier-candidate-v1 as CANDIDATE in {REGISTRY_PATH}")


if __name__ == "__main__":
    main()
