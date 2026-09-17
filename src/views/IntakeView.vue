<script setup>
import { onMounted, ref, watch } from "vue";

import AppTopbar from "@/components/AppTopbar.vue";
import SignInGate from "@/components/SignInGate.vue";
import StatusMessage from "@/components/StatusMessage.vue";
import BranchForm from "@/components/intake/BranchForm.vue";
import ChoiceCardGroup from "@/components/intake/ChoiceCardGroup.vue";
import FormField from "@/components/intake/FormField.vue";
import StepProgress from "@/components/intake/StepProgress.vue";
import SummarySection from "@/components/intake/SummarySection.vue";
import { CATEGORIES, DEPARTMENTS, SOCIAL_TYPES } from "@/lib/schema.js";
import { useAuthStore } from "@/stores/auth.js";
import { useIntakeStore } from "@/stores/intake.js";

const auth = useAuthStore();
const intake = useIntakeStore();
const summaryAnchor = ref(null);

const departmentOptions = DEPARTMENTS.map((value) => ({
  value,
  label: value || "Select department"
}));

function printSummary() {
  window.print();
}

onMounted(() => {
  intake.ensureDefaultTeams();
});

watch(
  () => intake.submitted,
  async (submitted) => {
    if (!submitted) return;
    await Promise.resolve();
    summaryAnchor.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
);
</script>

<template>
  <div class="ambient-layer" aria-hidden="true"></div>

  <main class="app-shell">
    <AppTopbar />

    <section class="glass-card hero-panel-clean">
      <div class="section-heading">
        <p class="eyebrow">Communications Intake</p>
        <h1>KSUM MEDIA BOX</h1>
        <p class="hero-text leading-prose text-ink-muted">
          A lightweight request desk for social media, PR, and achievement stories.
          Share the brief you have now, and the internal team can shape the workflow later.
        </p>
      </div>
    </section>

    <!-- Signed out: the form is not reachable at all. -->
    <SignInGate
      v-if="!auth.isSignedIn"
      class="mt-6"
      kicker="Sign in required"
      heading="Sign in to submit a request."
    />

    <!-- Waiting on the server verdict. The form must not appear yet. -->
    <section v-else-if="auth.isChecking" class="glass-card form-shell">
      <div class="section-heading">
        <p class="eyebrow">Checking access</p>
        <h2>Confirming your account...</h2>
      </div>
    </section>

    <!-- Signed in, but the backend says this account may not submit. -->
    <section v-else-if="!auth.canSubmit" class="glass-card form-shell">
      <div class="section-heading">
        <p class="eyebrow">Access</p>
        <h2>This account cannot submit requests.</h2>
        <p v-if="auth.error">{{ auth.error }}</p>
        <p v-else>
          You are signed in as <strong>{{ auth.email }}</strong>. Ask an admin to add
          you to the Users tab of the Media Box spreadsheet, then sign in again.
        </p>
      </div>
      <button type="button" class="btn-base ghost-button mt-6" @click="auth.signOut()">
        Sign out
      </button>
    </section>

    <template v-else>
      <section class="glass-card form-shell" id="requestHub">
        <div class="section-heading">
          <p class="eyebrow">Request Hub</p>
          <h2>Submit a PR or media request</h2>
          <p>
            Share as much or as little as you have right now. Missing details can be
            added later in the workflow desk.
          </p>
        </div>

        <StepProgress :active-index="intake.progressIndex" />

        <form class="media-form mt-6 grid gap-5" novalidate @submit.prevent="intake.submit()">
          <!-- Step 1 -->
          <template v-if="intake.currentStep === 'intro'">
            <section class="form-section">
              <div class="section-title">
                <span>Q1</span>
                <h3>Basic Details</h3>
              </div>

              <div class="field-grid two-col">
                <FormField
                  v-model="intake.form.employeeName"
                  name="employeeName"
                  label="Name"
                  placeholder="Enter full name"
                  required
                />
                <FormField
                  v-model="intake.form.department"
                  name="department"
                  label="Name of Department"
                  type="select"
                  :options="departmentOptions"
                  required
                />
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>Q2</span>
                <h3>Select Category</h3>
              </div>

              <ChoiceCardGroup
                v-model="intake.form.category"
                name="category"
                aria-label="Select request category"
                :options="CATEGORIES"
                @update:model-value="intake.onCategoryChange()"
              />

              <p class="support-copy mt-4">
                You can leave this blank and still continue. The team can classify the
                request later.
              </p>
            </section>

            <div class="step-actions flex flex-wrap items-center gap-3">
              <button type="button" class="btn-base primary-button" @click="intake.goForwardFromIntro()">
                Next
              </button>
              <StatusMessage :message="intake.status.message" :is-error="intake.status.isError" />
            </div>
          </template>

          <!-- Step 2 -->
          <template v-else-if="intake.currentStep === 'social-type'">
            <section class="form-section">
              <div class="section-title">
                <span>Q3</span>
                <h3>Social Media Type</h3>
              </div>

              <ChoiceCardGroup
                v-model="intake.form.socialType"
                name="socialType"
                aria-label="Select social media type"
                :options="SOCIAL_TYPES"
              />

              <p class="support-copy mt-4">
                If you are not sure yet, move ahead anyway. The request will still be saved.
              </p>
            </section>

            <div class="step-actions flex flex-wrap items-center gap-3">
              <button type="button" class="btn-base ghost-button" @click="intake.goToStep('intro')">
                Back
              </button>
              <button type="button" class="btn-base primary-button" @click="intake.goForwardFromSocialType()">
                Next
              </button>
            </div>
          </template>

          <!-- Step 3: one branch, or the no-category fallback -->
          <template v-else>
            <BranchForm v-if="intake.branch" :branch="intake.branch" />

            <section v-else class="form-section">
              <div class="section-title">
                <span>Q3</span>
                <h3>Ready to Submit</h3>
              </div>
              <p class="support-copy">
                No category has been selected yet. You can still submit this as a rough
                request, and the team can classify it from the workflow desk later.
              </p>
            </section>

            <div class="submit-panel grid gap-4">
              <div class="step-actions flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="btn-base ghost-button"
                  @click="intake.goToStep(
                    intake.currentStep === 'social-details' ? 'social-type' : intake.emptyBackStep
                  )"
                >
                  Back
                </button>

                <button
                  type="submit"
                  class="btn-base primary-button"
                  :disabled="intake.isSubmitting"
                >
                  {{ intake.isSubmitting ? "Submitting..." : "Submit request" }}
                </button>

                <button
                  type="button"
                  class="btn-base ghost-button no-print"
                  :disabled="!intake.submitted"
                  @click="printSummary"
                >
                  Print / Save PDF
                </button>
              </div>

              <StatusMessage :message="intake.status.message" :is-error="intake.status.isError" />
            </div>
          </template>
        </form>
      </section>

      <div ref="summaryAnchor"></div>
      <SummarySection v-if="intake.submitted && intake.summaryPayload" :payload="intake.summaryPayload" />
    </template>
  </main>
</template>
