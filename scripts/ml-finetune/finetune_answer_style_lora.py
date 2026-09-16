"""
Offline LoRA fine-tune of a small CAUSAL language model on real
query -> answer pairs -- distinct from finetune_intent_classifier.py
(that one fine-tunes a classification head; this one fine-tunes
generation, the "grounded answer style" target docs/ui/SIH.md §14
explicitly lists as a good fine-tuning target).

Why distilgpt2, not llama3.2:3b:
  No GPU in this environment. llama3.2:3b is ~3B parameters -- even a
  LoRA adapter's forward+backward pass over it is impractical on CPU in
  session time. distilgpt2 (82M params) is the standard small causal LM
  for exactly this kind of CPU-feasible LoRA demonstration. This is
  still not a fine-tune of the model actually serving traffic (Ollama's
  llama3.2:3b) -- it is a real, running proof that the LoRA fine-tuning
  mechanics work end-to-end on this project's own real data, at a scale
  this hardware can actually execute.

Why the result is a CANDIDATE, not a capability:
  20 real (query, answer) pairs from data/evaluation/generation-
  results.json. Far too few to teach a language model a real "grounded
  answer style" -- the honest expectation is memorization of these 20
  examples, not generalization. Nothing here is wired into
  src/lib/answer.ts or any runtime path; the adapter is saved purely as
  a reproducible artifact.

Usage:
  .venv-ml/Scripts/python.exe scripts/ml-finetune/finetune_answer_style_lora.py
"""

import json
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments

ROOT = Path(__file__).resolve().parents[2]
GENERATION_RESULTS = ROOT / "data" / "evaluation" / "generation-results.json"
ARTIFACT_DIR = ROOT / "data" / "ml" / "artifacts" / "answer-style-lora-v1"
REGISTRY_PATH = ROOT / "data" / "ml" / "artifacts" / "registry.json"

BASE_MODEL = "distilgpt2"  # 82M params -- CPU-feasible LoRA target; NOT the model serving traffic


def load_examples():
    rows = json.loads(GENERATION_RESULTS.read_text(encoding="utf-8"))
    examples = []
    for r in rows:
        resp = r.get("response")
        if not resp or not resp.get("answer"):
            continue
        examples.append({"query": r["query"], "answer": resp["answer"]})
    return examples


class CausalPairDataset(torch.utils.data.Dataset):
    """Each example is 'Query: {q}\\nAnswer: {a}<eos>', loss computed over the whole sequence -- simplest correct causal-LM fine-tune shape."""

    def __init__(self, tokenizer, examples, max_length=256):
        self.tokenizer = tokenizer
        self.texts = [f"Query: {e['query']}\nAnswer: {e['answer']}{tokenizer.eos_token}" for e in examples]
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        enc = self.tokenizer(
            self.texts[idx],
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )
        input_ids = enc["input_ids"][0]
        attention_mask = enc["attention_mask"][0]
        labels = input_ids.clone()
        labels[attention_mask == 0] = -100  # ignore padding in the loss
        return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": labels}


def main():
    examples = load_examples()
    if len(examples) < 5:
        print(f"Only {len(examples)} real (query, answer) examples exist -- too few to fine-tune anything. Aborting honestly.")
        return

    print(f"Loaded {len(examples)} real (query, answer) pairs from generation-results.json.")
    print("This is a CPU-scale LoRA demonstration on distilgpt2, not a fine-tune of the model actually serving traffic (llama3.2:3b via Ollama).\n")

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    tokenizer.pad_token = tokenizer.eos_token
    base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL)

    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["c_attn"],  # GPT-2-family attention projection -- the standard LoRA target for this arch
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(base_model, lora_config)
    trainable, total = model.get_nb_trainable_parameters()
    print(f"LoRA trainable params: {trainable:,} / {total:,} total ({100 * trainable / total:.3f}%)\n")

    dataset = CausalPairDataset(tokenizer, examples)

    training_args = TrainingArguments(
        output_dir=str(ARTIFACT_DIR / "checkpoints"),
        num_train_epochs=8,
        per_device_train_batch_size=2,
        learning_rate=2e-4,
        logging_steps=5,
        save_strategy="no",
        report_to=[],
    )

    trainer = Trainer(model=model, args=training_args, train_dataset=dataset)
    train_result = trainer.train()

    # Qualitative check, not a metric: does the adapter reproduce something
    # close to a real training answer when prompted with its own query?
    # This is the same "did it memorize" sanity check as the classifier
    # script -- reported as a sample, not scored, because there is no
    # honest held-out set at this size.
    model.eval()
    sample_query = examples[0]["query"]
    prompt = f"Query: {sample_query}\nAnswer:"
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        gen = model.generate(**inputs, max_new_tokens=60, do_sample=False, pad_token_id=tokenizer.eos_token_id)
    generated_text = tokenizer.decode(gen[0], skip_special_tokens=True)
    print(f"\nSample generation for a training query ('{sample_query}'):")
    print(generated_text)
    print(f"\nReal training answer for comparison:\n{examples[0]['answer'][:200]}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(ARTIFACT_DIR))
    tokenizer.save_pretrained(str(ARTIFACT_DIR))
    print(f"\nSaved LoRA adapter + tokenizer to {ARTIFACT_DIR}")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    registry.append(
        {
            "modelId": "answer-style-lora-candidate-v1",
            "modelName": f"LoRA adapter on {BASE_MODEL} for grounded-answer style",
            "version": "v1",
            "artifactPath": str(ARTIFACT_DIR.relative_to(ROOT)).replace("\\", "/"),
            "modelType": "trained_ml",
            "datasetVersion": f"generation-results-{len(examples)}rows",
            "metrics": {
                "trainingRows": len(examples),
                "finalTrainLoss": train_result.training_loss,
                "loraTrainableParams": trainable,
                "loraTrainableParamsPct": 100 * trainable / total,
                "note": "No held-out evaluation -- 20 examples is a memorization demonstration, not a generalization test.",
            },
            "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            "status": "CANDIDATE",
            "approvedBy": None,
            "checksum": None,
            "notes": (
                f"LoRA fine-tune (r=8, target_modules=['c_attn']) of {BASE_MODEL} (82M params) on 20 real "
                f"query/answer pairs from this session's own live generation runs. NOT a fine-tune of "
                f"llama3.2:3b (the model actually serving traffic via Ollama) -- no GPU in this "
                f"environment makes that impractical, and 20 examples could not move a 3B-parameter "
                f"model's behavior regardless. NOT wired into src/lib/answer.ts or any runtime path; "
                f"this repo's execution contract forbids a Python runtime inference service in the live "
                f"app. Exists purely as a reproducible proof that the LoRA pipeline runs end-to-end on "
                f"real data, at the scale this hardware can execute."
            ),
        }
    )
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    print(f"Registered answer-style-lora-candidate-v1 as CANDIDATE in {REGISTRY_PATH}")


if __name__ == "__main__":
    main()
