import { DomainError } from "../shared/errors.js";
import type { PlanTier } from "../value-objects/plan-tier.js";
import { isPlanTier } from "../value-objects/plan-tier.js";

export interface UserProps {
  readonly id: string;
  readonly email: string;
  readonly plan: PlanTier;
  readonly eduVerified: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class User {
  readonly id: string;
  readonly email: string;
  readonly plan: PlanTier;
  readonly eduVerified: boolean;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.plan = props.plan;
    this.eduVerified = props.eduVerified;
  }

  static create(props: UserProps): User {
    if (!props.id?.trim()) {
      throw DomainError.validation("User id is required");
    }
    if (!props.email?.trim() || !EMAIL_PATTERN.test(props.email.trim())) {
      throw DomainError.validation("User email is invalid", {
        email: props.email,
      });
    }
    if (!isPlanTier(props.plan)) {
      throw DomainError.validation("User plan is invalid", {
        plan: props.plan,
      });
    }
    if (props.plan === "edu" && !props.eduVerified) {
      throw DomainError.validation(
        "Edu plan requires eduVerified to be true"
      );
    }

    return new User({
      id: props.id.trim(),
      email: props.email.trim().toLowerCase(),
      plan: props.plan,
      eduVerified: Boolean(props.eduVerified),
    });
  }

  withPlan(plan: PlanTier, eduVerified = this.eduVerified): User {
    return User.create({
      id: this.id,
      email: this.email,
      plan,
      eduVerified,
    });
  }

  isPaid(): boolean {
    return this.plan === "pro" || this.plan === "edu";
  }
}
