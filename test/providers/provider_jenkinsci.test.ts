import td from 'testdouble'
import childProcess from 'child_process'

import * as providerJenkinsci from '../../src/ci_providers/provider_jenkinsci'
import { SPAWNPROCESSBUFFERSIZE } from '../../src/helpers/constants'
import { IServiceParams, UploaderInputs } from '../../src/types'
import { createEmptyArgs } from '../test_helpers'

describe('Jenkins CI Params', () => {
  afterEach(() => {
    td.reset()
  })

  describe('detect()', () => {
    it('does not run without JenkinsCI env variable', () => {
      const inputs: UploaderInputs = {
        args: { ...createEmptyArgs() },
        envs: {},
      }
      let detected = providerJenkinsci.detect(inputs.envs)
      expect(detected).toBeFalsy()

      inputs.envs.JENKINS_URL = ''
      detected = providerJenkinsci.detect(inputs.envs)
      expect(detected).toBeFalsy()
    })

    it('does run with JenkinsCI env variable', () => {
      const inputs: UploaderInputs = {
        args: { ...createEmptyArgs() },
        envs: {
          JENKINS_URL: 'https://example.jenkins.com',
        },
      }
      const detected = providerJenkinsci.detect(inputs.envs)
      expect(detected).toBeTruthy()
    })
  })

  it('gets correct params on push', async () => {
    const inputs: UploaderInputs = {
      args: { ...createEmptyArgs() },
      envs: {
        BUILD_NUMBER: '1',
        BUILD_URL: 'https://example.jenkins.com',
        CHANGE_ID: '2',
        GIT_BRANCH: 'main',
        GIT_COMMIT: 'testingsha',
        JENKINS_URL: 'https://example.com',
      },
    }
    const expected: IServiceParams = {
      branch: 'main',
      build: '1',
      buildURL: 'https://example.jenkins.com',
      commit: 'testingsha',
      job: '',
      pr: '2',
      service: 'jenkins',
      slug: '',
    }
    const spawnSync = td.replace(childProcess, 'spawnSync')
    td.when(
      spawnSync('git', ['config', '--get', 'remote.origin.url'], { maxBuffer: SPAWNPROCESSBUFFERSIZE }),
    ).thenReturn({ stdout: '' })
    const params = await providerJenkinsci.getServiceParams(inputs)
    expect(params).toMatchObject(expected)
  })

  it('can get the slug from git config', async () => {
    const inputs: UploaderInputs = {
      args: { ...createEmptyArgs() },
      envs: {
        BUILD_NUMBER: '1',
        BUILD_URL: 'https://example.jenkins.com',
        CHANGE_ID: '2',
        GIT_BRANCH: 'main',
        GIT_COMMIT: 'testingsha',
        JENKINS_URL: 'https://example.com',
      },
    }
    const spawnSync = td.replace(childProcess, 'spawnSync')
    td.when(
      spawnSync('git', ['config', '--get', 'remote.origin.url'], { maxBuffer: SPAWNPROCESSBUFFERSIZE }),
    ).thenReturn({ stdout: 'https://github.com/testOrg/testRepo.git' })

    const params = await providerJenkinsci.getServiceParams(inputs)
    expect(params.slug).toBe('testOrg/testRepo')
  })

  it('gets correct params for overrides', async () => {
    const inputs: UploaderInputs = {
      args: {
        ...createEmptyArgs(),
        ...{
          branch: 'branch',
          build: '3',
          pr: '2',
          sha: 'testsha',
          slug: 'testOrg/testRepo',
        },
      },
      envs: {
        JENKINS_URL: 'https://example.com',
      },
    }
    const expected: IServiceParams = {
      branch: 'branch',
      build: '3',
      buildURL: '',
      commit: 'testsha',
      job: '',
      pr: '2',
      service: 'jenkins',
      slug: 'testOrg/testRepo',
    }

    const params = await providerJenkinsci.getServiceParams(inputs)
    expect(params).toMatchObject(expected)
  })
})
