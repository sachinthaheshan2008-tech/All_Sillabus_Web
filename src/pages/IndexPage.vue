<template>
  <q-page class="edu-page" :class="{ 'dark-theme': $q.dark.isActive }">
    <div class="workspace-tabs-bar">
      <q-tabs
        v-model="activeWorkspaceTab"
        align="center"
        inline-label
        :indicator-color="$q.dark.isActive ? 'purple-4' : 'deep-purple'"
        :active-color="$q.dark.isActive ? 'white' : 'dark'"
        class="workspace-tabs"
      >
        <q-tab v-for="tab in workspaceTabs" :key="tab" :name="tab" :label="tab" />
      </q-tabs>
      <q-btn
        class="theme-toggle-btn"
        unelevated
        rounded
        :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
        :label="$q.dark.isActive ? 'Light' : 'Dark'"
        @click="toggleDarkMode"
      />
    </div>

    <div class="dashboard-shell">
      <aside class="left-panel">
        <template v-if="isProfileTab">
          <div class="brand">
            <img class="brand-logo" :src="appLogo" width="28" height="28" alt="" />
            <span>Syllabus Easier</span>
          </div>

          <div class="profile-box">
            <q-avatar size="40px" color="positive" text-color="white">EX</q-avatar>
            <div>
              <div class="text-subtitle1 text-weight-bold">Learning Path</div>
              <div class="text-caption text-grey-7">Level 12 Explorer</div>
            </div>
          </div>

          <q-list class="menu-list" padding>
            <q-item
              v-for="item in sideMenu"
              :key="item.label"
              clickable
              :active="activeMenu === item.value"
              active-class="menu-active"
              @click="selectMenu(item.value)"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" />
              </q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </q-list>

          <q-btn
            class="continue-btn"
            color="positive"
            label="Continue Learning"
            icon-right="arrow_forward"
            unelevated
            rounded
            @click="continueLearning"
          />
        </template>
        <template v-else-if="isChemistryTab">
          <div class="chemistry-side-title">ශක්ති විද්‍යාව: එන්තැල්පි</div>
        </template>
      </aside>

      <section class="main-panel" :class="{ 'mindmap-panel-active': activeMenu === 'mindmap-view' || activeMenu === 'mindmap-edit' }">
        <template v-if="isProfileTab">
          <template v-if="activeMenu === 'mindmap-view' || activeMenu === 'mindmap-edit'">
            <MindMapView :mode="activeMenu === 'mindmap-edit' ? 'edit' : 'view'" />
          </template>
          <template v-else>
            <div class="hero-grid">
            <q-card class="hero-card" flat>
              <div class="text-h3 text-weight-bolder">Level Up Your Learning! 🚀</div>
              <div class="text-subtitle1 q-mt-sm text-grey-8">
                Welcome back, Explorer. You're on a 5-day streak. Keep the momentum going!
              </div>

              <q-card class="up-next-card" flat>
                <div class="up-next-pill">UP NEXT</div>
                <div class="row items-center justify-between q-mt-md">
                  <div class="text-caption text-orange-4 text-weight-medium">{{ activeTopic }}</div>
                  <q-btn
                    round
                    size="sm"
                    color="white"
                    text-color="positive"
                    icon="play_arrow"
                    @click="playNextLesson"
                  />
                </div>
                <div class="text-h4 text-weight-bold q-mt-sm">
                  Thermodynamics: Entropy & Enthalpy
                </div>
                <q-linear-progress
                  :value="lessonProgress"
                  rounded
                  size="8px"
                  color="white"
                  track-color="teal-3"
                  class="q-mt-lg"
                />
                <div class="text-caption q-mt-sm text-white">
                  {{ Math.round(lessonProgress * 100) }}% Completed - 12 mins left
                </div>
              </q-card>
            </q-card>

            <q-card class="energy-card" flat>
              <div class="text-h5 text-weight-bold">Daily Energy</div>
              <div class="energy-value q-mt-xl">🔥 {{ dailyEnergy }}%</div>
              <p class="text-grey-7 q-mt-md">
                You're on fire today! Complete one more module to hit your daily goal.
              </p>
              <q-btn
                flat
                color="deep-purple"
                label="Boost Energy"
                icon="local_fire_department"
                @click="boostEnergy"
              />
            </q-card>
          </div>

          <div class="row items-center justify-between q-mt-lg">
            <div class="text-h5 text-weight-bold">Subjects</div>
            <q-btn color="positive" icon="add" label="Add subject" dense unelevated @click="openAddSubject" />
          </div>

          <div class="subject-grid q-mt-md">
            <q-card
              v-for="subject in subjects"
              :key="subject.id"
              class="subject-card"
              flat
              clickable
              @click="openSubject(subject)"
            >
              <q-btn
                class="subject-delete-btn"
                icon="close"
                dense
                round
                flat
                color="grey-7"
                @click.stop="removeSubject(subject.id)"
              />
              <div class="row items-center justify-between">
                <div>
                  <div class="text-h6 text-weight-bold">{{ subject.name }}</div>
                  <div class="text-caption text-grey-7">LEVEL {{ subject.level }}</div>
                </div>
                <q-icon :name="subject.icon" :color="subject.color" size="22px" />
              </div>
              <q-linear-progress
                :value="subject.progress"
                rounded
                size="10px"
                :color="subject.color"
                track-color="grey-4"
                class="q-mt-md"
              />
            </q-card>
          </div>

          <div class="q-mt-xl">
            <div class="text-h5 text-weight-bold q-mb-md">Today's Quests</div>
            <div class="quest-grid">
              <q-card
                v-for="quest in quests"
                :key="quest.id"
                class="quest-card"
                flat
                clickable
                @click="toggleQuest(quest.id)"
              >
                <div class="row items-center no-wrap">
                  <q-icon
                    :name="quest.completed ? 'check_circle' : 'radio_button_unchecked'"
                    :color="quest.completed ? 'positive' : 'grey-6'"
                    size="22px"
                    class="q-mr-sm"
                  />
                  <div class="col">
                    <div class="text-subtitle1 text-weight-medium">{{ quest.title }}</div>
                    <div v-if="quest.completed" class="text-caption text-positive">+50 XP Earned</div>
                    <div v-else class="text-caption text-purple">{{ quest.reward }}</div>
                  </div>
                  <q-icon name="chevron_right" color="grey-6" />
                </div>
              </q-card>
            </div>
          </div>
        </template>
      </template>
        <template v-else-if="isChemistryTab">
          <div class="chemistry-content-wrap">
            <iframe
              class="chemistry-content-frame"
              :src="enthalpyGuideSrc"
              title="එන්තැල්පි අධ්‍යයන මාර්ගෝපදේශය"
            />
          </div>
        </template>
      </section>
    </div>

    <q-dialog v-model="subjectDialogOpen" transition-show="scale" transition-hide="scale" @hide="onSubjectDialogHide">
      <q-card class="subject-dialog-card">
        <q-card-section>
          <div class="text-h6 q-mb-md">New subject</div>
          <q-input
            ref="subjectNameInputRef"
            v-model="newSubjectName"
            label="Subject name"
            outlined
            dense
            maxlength="80"
            @keyup.enter.prevent="confirmAddSubject"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn color="positive" label="Add" unelevated @click="confirmAddSubject" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import MindMapView from 'pages/MindMapView.vue'

const router = useRouter()
const route = useRoute()

onMounted(() => {
  if (route.path.includes('mindmap-edit')) {
    activeMenu.value = 'mindmap-edit'
  } else if (route.path.includes('mindmap-view') || route.path.includes('mindmap')) {
    activeMenu.value = 'mindmap-view'
  }
})

watch(() => route.path, (newPath) => {
  if (newPath.includes('mindmap-edit')) {
    activeMenu.value = 'mindmap-edit'
  } else if (newPath.includes('mindmap-view') || newPath.includes('mindmap')) {
    activeMenu.value = 'mindmap-view'
  } else {
    if (newPath === '/' && (activeMenu.value === 'mindmap-view' || activeMenu.value === 'mindmap-edit')) {
      activeMenu.value = 'study-plan'
    }
  }
})

import appLogo from '../assets/app-logo.png'

const $q = useQuasar()

const workspaceTabs = ['Profile', 'Chemistry', 'Physics', 'Combined', 'Others']
const activeWorkspaceTab = ref('Profile')
const isProfileTab = computed(() => activeWorkspaceTab.value === 'Profile')
const isChemistryTab = computed(() => activeWorkspaceTab.value === 'Chemistry')
const enthalpyGuideSrc = computed(
  () => `/content/enthalpy-guide.html?theme=${$q.dark.isActive ? 'dark' : 'light'}`,
)

const activeMenu = ref('study-plan')
const activeTopic = ref('Chemistry')
const lessonProgress = ref(0.65)
const dailyEnergy = ref(75)

const sideMenu = [
  { label: 'Curriculum', value: 'curriculum', icon: 'menu_book' },
  { label: 'Study Plan', value: 'study-plan', icon: 'event_note' },
  { label: 'Flashcards', value: 'flashcards', icon: 'quiz' },
  { label: 'Achievements', value: 'achievements', icon: 'emoji_events' },
  { label: 'Mind Map View', value: 'mindmap-view', icon: 'visibility' },
  { label: 'Mind Map Edit', value: 'mindmap-edit', icon: 'edit' },
]

function newSubjectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const subjects = ref([
  {
    id: newSubjectId(),
    name: 'Chemistry',
    level: 8,
    progress: 0.74,
    icon: 'science',
    color: 'orange',
  },
  {
    id: newSubjectId(),
    name: 'Physics',
    level: 6,
    progress: 0.52,
    icon: 'timeline',
    color: 'deep-purple',
  },
  {
    id: newSubjectId(),
    name: 'Maths',
    level: 10,
    progress: 0.89,
    icon: 'calculate',
    color: 'teal',
  },
])

const subjectDialogOpen = ref(false)
const newSubjectName = ref('')
const subjectNameInputRef = ref(null)

function openAddSubject() {
  newSubjectName.value = ''
  subjectDialogOpen.value = true
  nextTick(() => {
    subjectNameInputRef.value?.focus?.()
  })
}

function onSubjectDialogHide() {
  newSubjectName.value = ''
  nextTick(() => {
    subjectNameInputRef.value?.blur?.()
    globalThis.document?.body?.style?.removeProperty?.('overflow')
  })
}

function confirmAddSubject() {
  const name = newSubjectName.value.trim()
  if (!name) {
    $q.notify({ message: 'Enter a subject name', color: 'warning', position: 'top-right', timeout: 1400 })
    return
  }
  subjects.value.push({
    id: newSubjectId(),
    name,
    level: 1,
    progress: 0,
    icon: 'menu_book',
    color: 'deep-purple',
  })
  subjectDialogOpen.value = false
  notify(`${name} added`)
}

function removeSubject(id) {
  subjects.value = subjects.value.filter((item) => item.id !== id)
}

const quests = ref([
  {
    id: 1,
    title: 'Review Kinematics Flashcards',
    reward: 'Reward: 50 XP',
    completed: true,
  },
  {
    id: 2,
    title: 'Complete Algebra Quiz',
    reward: 'Reward: Rare Badge',
    completed: false,
  },
])

function notify(message) {
  $q.notify({
    message,
    color: 'positive',
    position: 'top-right',
    timeout: 1200,
  })
}

function selectMenu(value) {
  activeMenu.value = value
  if (value === 'mindmap-view') {
    router.push('/mindmap-view')
  } else if (value === 'mindmap-edit') {
    router.push('/mindmap-edit')
  } else {
    router.push('/')
  }
  notify(`Opened ${sideMenu.find((item) => item.value === value)?.label}`)
}

function continueLearning() {
  lessonProgress.value = Math.min(1, lessonProgress.value + 0.1)
  dailyEnergy.value = Math.min(100, dailyEnergy.value + 4)
  notify('Continuing current lesson')
}

function toggleDarkMode() {
  $q.dark.toggle()
  notify($q.dark.isActive ? 'Dark mode on' : 'Dark mode off')
}

function playNextLesson() {
  lessonProgress.value = Math.min(1, lessonProgress.value + 0.15)
  notify(`Playing next lesson in ${activeTopic.value}`)
}

function boostEnergy() {
  dailyEnergy.value = Math.min(100, dailyEnergy.value + 5)
  notify('Energy boosted')
}

function openSubject(subject) {
  activeTopic.value = subject.name
  notify(`${subject.name} selected`)
}

function toggleQuest(questId) {
  const quest = quests.value.find((item) => item.id === questId)
  if (!quest) return
  quest.completed = !quest.completed
  notify(quest.completed ? `${quest.title} completed` : `${quest.title} reopened`)
}
</script>

<style scoped>
.edu-page {
  background: #edf6f1;
  min-height: 100vh;
  padding: 14px;
}

.workspace-tabs-bar {
  margin-bottom: 10px;
  background: #f9fdfb;
  border: 1px solid #dbefe6;
  border-radius: 12px;
  padding: 6px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.workspace-tabs {
  min-height: 40px;
  width: auto;
  border-radius: 10px;
}

:deep(.workspace-tabs .q-tab) {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.workspace-tabs .q-tab__label) {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.theme-toggle-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #13c9a4 0%, #7a56f5 100%);
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.01em;
  min-width: 90px;
}

.dashboard-shell {
  min-height: calc(100vh - 96px);
  background: #f9fdfb;
  border: 1px solid #dbefe6;
  border-radius: 22px;
  display: grid;
  grid-template-columns: 240px 1fr;
  overflow: hidden;
}

.left-panel {
  border-right: 1px solid #dbe9e2;
  background: #f2faf5;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chemistry-side-title {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.4;
  color: #0f7e5d;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1a8f64;
  font-size: 1.3rem;
  font-weight: 700;
}

.brand-logo {
  display: block;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.subject-dialog-card {
  min-width: 300px;
}

.subject-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
}

.profile-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-list {
  padding: 0;
}

.menu-active {
  background: #8e55f4;
  color: #fff;
  border-radius: 999px;
}

.continue-btn {
  margin-top: auto;
}

.main-panel {
  padding: 18px 28px 28px;
}

.chemistry-content-wrap {
  background: #eef6f1;
  border: 1px solid #d9e8e0;
  border-radius: 14px;
  overflow: hidden;
}

.chemistry-content-frame {
  display: block;
  width: 100%;
  min-height: calc(100vh - 160px);
  border: 0;
  background: #ffffff;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 18px;
}

.hero-card {
  border-radius: 18px;
  background: transparent;
}

.up-next-card {
  margin-top: 18px;
  border-radius: 24px;
  padding: 22px;
  color: #fff;
  background: linear-gradient(140deg, #19d9b4 0%, #038e7d 92%);
}

.up-next-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.energy-card {
  border-radius: 24px;
  background: #f4f2f7;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.energy-value {
  font-size: 2rem;
  font-weight: 800;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.subject-card {
  position: relative;
  border-radius: 16px;
  background: #f0f5f1;
  padding: 16px 36px 16px 16px;
}

.quest-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quest-card {
  border-radius: 16px;
  border: 2px solid #e3e6e8;
  padding: 14px 16px;
  background: #fbfefd;
}

.dark-theme {
  background: #0d1117;
  color: #e6edf3;
}

.dark-theme .workspace-tabs-bar {
  background: #111a23;
  border-color: #243140;
}

.dark-theme .dashboard-shell {
  background: #0f1721;
  border-color: #263242;
}

.dark-theme .left-panel {
  background: #121d29;
  border-right-color: #263242;
}

.dark-theme .chemistry-side-title {
  color: #8fe9cd;
}

.dark-theme .brand {
  color: #73e2c2;
}

.dark-theme .menu-active {
  background: #6f4cf1;
}

.dark-theme .main-panel {
  color: #e6edf3;
}

.dark-theme .text-grey-7,
.dark-theme .text-grey-8 {
  color: #b8c2cc !important;
}

.dark-theme .energy-card {
  background: #1b2330;
}

.dark-theme .subject-card {
  background: #1a2430;
}

.dark-theme .quest-card {
  background: #161f2b;
  border-color: #2c3a4d;
}

.dark-theme .up-next-card {
  background: linear-gradient(140deg, #10b89c 0%, #066f66 92%);
}

.dark-theme .theme-toggle-btn {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.dark-theme .chemistry-content-wrap {
  background: #121d29;
  border-color: #2a3a4c;
}

.dark-theme .chemistry-content-frame {
  background: #0f1721;
}

.dark-theme :deep(.q-tab) {
  color: #aab7c4;
}

.dark-theme :deep(.q-tab--active) {
  color: #ffffff;
}

.dark-theme :deep(.workspace-tabs .q-tab:hover) {
  background: rgba(142, 85, 244, 0.18);
}

:deep(.workspace-tabs .q-tab:hover) {
  background: rgba(142, 85, 244, 0.1);
}

@media (max-width: 1100px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .left-panel {
    border-right: none;
    border-bottom: 1px solid #dbe9e2;
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }

  .subject-grid,
  .quest-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .workspace-tabs-bar {
    justify-content: space-between;
    padding-right: 8px;
  }

  .workspace-tabs {
    width: calc(100% - 102px);
  }

  .theme-toggle-btn {
    position: static;
    transform: none;
    min-width: 84px;
  }
}

.mindmap-panel-active {
  padding: 0 !important;
  height: calc(100vh - 96px) !important;
  position: relative;
  overflow: hidden;
}
</style>
